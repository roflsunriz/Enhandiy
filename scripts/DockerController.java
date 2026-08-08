import java.awt.Desktop;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class DockerController {
    enum ContainerState {
        CHECKING,
        RUNNING,
        STOPPED,
        UNAVAILABLE
    }

    static final class StatusResult {
        final ContainerState state;
        final String output;

        StatusResult(ContainerState state, String output) {
            this.state = state;
            this.output = output == null ? "" : output;
        }
    }

    static final class CommandResult {
        private final int exitCode;
        final String output;
        private final boolean timedOut;

        CommandResult(int exitCode, String output, boolean timedOut) {
            this.exitCode = exitCode;
            this.output = output == null ? "" : output;
            this.timedOut = timedOut;
        }

        boolean isSuccess() {
            return !timedOut && exitCode == 0;
        }

        String describe() {
            if (timedOut) {
                return "Command timed out.";
            }
            String detail = output.strip();
            return detail.isEmpty()
                ? "Docker command failed (exit " + exitCode + ")."
                : detail;
        }
    }

    private static final Pattern HTTP_PORT = Pattern.compile(
        "(?:(?:127\\.0\\.0\\.1|0\\.0\\.0\\.0):)?(\\d+):80(?:/tcp)?"
    );
    private final Path repositoryRoot;
    final Path composeFile;
    private final URI applicationUri;

    DockerController(Path repositoryRoot) {
        this.repositoryRoot = repositoryRoot;
        this.composeFile = repositoryRoot.resolve("infrastructure/docker-compose.yaml").normalize();
        try {
            String compose = Files.readString(composeFile, StandardCharsets.UTF_8);
            int port = parseHttpPort(compose);
            this.applicationUri = URI.create(
                port == 80 ? "http://localhost" : "http://localhost:" + port
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read Docker Compose configuration.", exception);
        }
    }

    static boolean isRepositoryRoot(Path candidate) {
        return Files.isRegularFile(candidate.resolve("infrastructure/docker-compose.yaml"));
    }

    static int parseHttpPort(String composeContent) {
        boolean inWebService = false;
        int webIndent = -1;
        for (String line : composeContent.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            int indent = line.indexOf(trimmed);
            if (!inWebService && trimmed.equals("web:")) {
                inWebService = true;
                webIndent = indent;
                continue;
            }
            if (!inWebService) {
                continue;
            }
            if (indent <= webIndent) {
                break;
            }
            Matcher matcher = HTTP_PORT.matcher(trimmed);
            if (matcher.find()) {
                int port = Integer.parseInt(matcher.group(1));
                return port >= 1 && port <= 65535 ? port : 80;
            }
        }
        return 80;
    }

    URI getApplicationUri() {
        return applicationUri;
    }

    StatusResult checkStatus() {
        CommandResult composeVersion = execute(
            Arrays.asList("docker", "compose", "version"),
            15
        );
        if (!composeVersion.isSuccess()) {
            return new StatusResult(ContainerState.UNAVAILABLE, composeVersion.describe());
        }

        CommandResult status = execute(composeCommand("ps", "--status", "running", "--services", "web"), 20);
        if (!status.isSuccess()) {
            return new StatusResult(ContainerState.UNAVAILABLE, status.describe());
        }
        boolean running = status.output.lines().anyMatch(line -> line.trim().equals("web"));
        return new StatusResult(running ? ContainerState.RUNNING : ContainerState.STOPPED, status.output);
    }

    CommandResult start() {
        CommandResult start = execute(composeCommand("up", "-d", "web"), 180);
        if (!start.isSuccess()) {
            return start;
        }
        for (int attempt = 0; attempt < 60; attempt++) {
            if (isApplicationReady()) {
                return start;
            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                return new CommandResult(1, "Startup wait was interrupted.", false);
            }
        }
        CommandResult logs = execute(composeCommand("logs", "--tail", "40", "web"), 20);
        return new CommandResult(
            1,
            "Container started, but HTTP did not become ready at " + applicationUri + ".\n" + logs.output,
            false
        );
    }

    CommandResult stop() {
        return execute(composeCommand("down"), 180);
    }

    void openBrowser() throws IOException {
        if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            Desktop.getDesktop().browse(applicationUri);
            return;
        }
        String operatingSystem = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (operatingSystem.contains("win")) {
            new ProcessBuilder("rundll32", "url.dll,FileProtocolHandler", applicationUri.toString()).start();
        } else if (operatingSystem.contains("mac")) {
            new ProcessBuilder("open", applicationUri.toString()).start();
        } else {
            new ProcessBuilder("xdg-open", applicationUri.toString()).start();
        }
    }

    private boolean isApplicationReady() {
        try {
            HttpURLConnection connection = (HttpURLConnection)applicationUri.toURL().openConnection();
            connection.setConnectTimeout(1500);
            connection.setReadTimeout(1500);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestMethod("GET");
            int status = connection.getResponseCode();
            connection.disconnect();
            return status >= 200 && status < 400;
        } catch (IOException ignored) {
            return false;
        }
    }

    private List<String> composeCommand(String... arguments) {
        List<String> command = new ArrayList<>();
        command.add("docker");
        command.add("compose");
        command.add("-f");
        command.add(composeFile.toString());
        command.addAll(Arrays.asList(arguments));
        return command;
    }

    private CommandResult execute(List<String> command, int timeoutSeconds) {
        Process process = null;
        try {
            ProcessBuilder builder = new ProcessBuilder(command);
            builder.directory(repositoryRoot.toFile());
            builder.redirectErrorStream(true);
            process = builder.start();
            Process runningProcess = process;
            CompletableFuture<String> output = CompletableFuture.supplyAsync(
                () -> readOutput(runningProcess.getInputStream())
            );
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroy();
                if (!process.waitFor(2, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                }
                return new CommandResult(-1, getOutput(output), true);
            }
            return new CommandResult(process.exitValue(), getOutput(output), false);
        } catch (IOException exception) {
            return new CommandResult(-1, exception.getMessage(), false);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            if (process != null) {
                process.destroyForcibly();
            }
            return new CommandResult(-1, "Docker command was interrupted.", false);
        }
    }

    private static String readOutput(InputStream input) {
        try (InputStream stream = input; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            stream.transferTo(bytes);
            return bytes.toString(Charset.defaultCharset());
        } catch (IOException exception) {
            return exception.getMessage() == null ? "" : exception.getMessage();
        }
    }

    private static String getOutput(CompletableFuture<String> output) {
        try {
            return output.get(5, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return "";
        } catch (ExecutionException | TimeoutException exception) {
            return "";
        }
    }
}
