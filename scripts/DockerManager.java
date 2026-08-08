import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JProgressBar;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import javax.swing.UIManager;
import javax.swing.border.EmptyBorder;
import javax.imageio.ImageIO;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.RenderingHints;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.MessageFormat;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public final class DockerManager {
    private static final Color WINDOW_BACKGROUND = new Color(243, 246, 250);
    private static final Color CARD_BACKGROUND = Color.WHITE;
    private static final Color TEXT_PRIMARY = new Color(25, 33, 45);
    private static final Color TEXT_SECONDARY = new Color(91, 103, 120);
    private static final Color ACCENT = new Color(34, 104, 210);
    private static final Color SUCCESS = new Color(24, 132, 87);
    private static final Color DANGER = new Color(190, 53, 65);
    private static final Color WARNING = new Color(176, 111, 18);
    private static final DateTimeFormatter LOG_TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final ResourceBundle messages;
    private final DockerController controller;
    private final ExecutorService executor;
    private final AtomicBoolean checkingStatus = new AtomicBoolean(false);

    private JFrame frame;
    private JLabel statusValue;
    private JLabel urlValue;
    private JButton startButton;
    private JButton stopButton;
    private JButton openButton;
    private JButton refreshButton;
    private JTextArea logArea;
    private JProgressBar progressBar;
    private Timer statusTimer;
    private volatile boolean operationRunning;
    private DockerController.ContainerState currentState = DockerController.ContainerState.CHECKING;

    private DockerManager(Path repositoryRoot, ResourceBundle messages) {
        this.messages = messages;
        this.controller = new DockerController(repositoryRoot);
        this.executor = Executors.newSingleThreadExecutor(task -> {
            Thread thread = new Thread(task, "enhandiy-docker-manager");
            thread.setDaemon(true);
            return thread;
        });
    }

    public static void main(String[] args) {
        if (Arrays.asList(args).contains("--self-test")) {
            runSelfTest();
            return;
        }
        if (Arrays.asList(args).contains("--integration-test")) {
            runIntegrationTest();
            return;
        }

        ResourceBundle messages = loadMessages();
        Path repositoryRoot = locateRepositoryRoot();
        if (repositoryRoot == null) {
            JOptionPane.showMessageDialog(
                null,
                messages.getString("error.repositoryNotFound"),
                messages.getString("error.title"),
                JOptionPane.ERROR_MESSAGE
            );
            System.exit(1);
        }

        boolean renderPreview = Arrays.asList(args).contains("--render-preview");
        SwingUtilities.invokeLater(() -> {
            applyLookAndFeel();
            DockerManager manager = new DockerManager(repositoryRoot, messages);
            manager.show();
            if (renderPreview) {
                Timer previewTimer = new Timer(1200, event -> manager.savePreviewAndExit());
                previewTimer.setRepeats(false);
                previewTimer.start();
            }
        });
    }

    private static ResourceBundle loadMessages() {
        return ResourceBundle.getBundle("i18n.DockerManagerMessages", Locale.getDefault());
    }

    private static void applyLookAndFeel() {
        try {
            for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
                if ("Nimbus".equals(info.getName())) {
                    UIManager.setLookAndFeel(info.getClassName());
                    break;
                }
            }
        } catch (Exception ignored) {
            // Swing標準のLook & Feelへ安全にフォールバックする。
        }
    }

    private void show() {
        frame = new JFrame(text("app.title"));
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        frame.setMinimumSize(new Dimension(700, 520));
        frame.setSize(790, 590);
        frame.setLocationRelativeTo(null);
        frame.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent event) {
                if (operationRunning) {
                    int choice = JOptionPane.showConfirmDialog(
                        frame,
                        text("confirm.closeWhileRunning"),
                        text("confirm.title"),
                        JOptionPane.YES_NO_OPTION,
                        JOptionPane.WARNING_MESSAGE
                    );
                    if (choice != JOptionPane.YES_OPTION) {
                        return;
                    }
                }
                statusTimer.stop();
                executor.shutdownNow();
                frame.dispose();
            }
        });

        JPanel root = new JPanel(new BorderLayout(0, 18));
        root.setBackground(WINDOW_BACKGROUND);
        root.setBorder(new EmptyBorder(24, 26, 24, 26));
        root.add(buildHeader(), BorderLayout.NORTH);
        root.add(buildContent(), BorderLayout.CENTER);
        frame.setContentPane(root);
        frame.setVisible(true);

        appendLog(text("log.ready"));
        refreshStatus(true);
        statusTimer = new Timer(5000, event -> refreshStatus(false));
        statusTimer.start();
    }

    private void savePreviewAndExit() {
        String configuredPath = System.getProperty("enhandiy.previewPath", "docker-manager-preview.png");
        Path previewPath = Paths.get(configuredPath).toAbsolutePath().normalize();
        BufferedImage image = new BufferedImage(
            frame.getContentPane().getWidth(),
            frame.getContentPane().getHeight(),
            BufferedImage.TYPE_INT_ARGB
        );
        Graphics2D graphics = image.createGraphics();
        try {
            frame.getContentPane().printAll(graphics);
            ImageIO.write(image, "png", previewPath.toFile());
            System.out.println("Docker manager preview saved: " + previewPath);
        } catch (IOException exception) {
            System.err.println("Docker manager preview failed: " + exception.getMessage());
            System.exit(1);
        } finally {
            graphics.dispose();
            statusTimer.stop();
            executor.shutdownNow();
            frame.dispose();
        }
        System.exit(0);
    }

    private JPanel buildHeader() {
        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setOpaque(false);

        JPanel titles = new JPanel(new GridLayout(0, 1, 0, 4));
        titles.setOpaque(false);
        JLabel title = new JLabel(text("app.title"));
        title.setFont(title.getFont().deriveFont(Font.BOLD, 25f));
        title.setForeground(TEXT_PRIMARY);
        JLabel subtitle = new JLabel(text("app.subtitle"));
        subtitle.setFont(subtitle.getFont().deriveFont(Font.PLAIN, 13f));
        subtitle.setForeground(TEXT_SECONDARY);
        titles.add(title);
        titles.add(subtitle);
        header.add(titles, BorderLayout.CENTER);

        statusValue = new JLabel(text("status.checking"), SwingConstants.CENTER);
        statusValue.setOpaque(true);
        statusValue.setBorder(new EmptyBorder(8, 14, 8, 14));
        statusValue.setFont(statusValue.getFont().deriveFont(Font.BOLD, 13f));
        header.add(statusValue, BorderLayout.EAST);
        applyState(DockerController.ContainerState.CHECKING);
        return header;
    }

    private JPanel buildContent() {
        JPanel content = new JPanel(new BorderLayout(0, 16));
        content.setOpaque(false);
        content.add(buildControlCard(), BorderLayout.NORTH);
        content.add(buildLogCard(), BorderLayout.CENTER);
        return content;
    }

    private JPanel buildControlCard() {
        JPanel card = createCard(new BorderLayout(0, 16));

        JPanel endpoint = new JPanel(new BorderLayout(10, 0));
        endpoint.setOpaque(false);
        JLabel urlLabel = new JLabel(text("url.label"));
        urlLabel.setForeground(TEXT_SECONDARY);
        urlLabel.setFont(urlLabel.getFont().deriveFont(Font.BOLD, 12f));
        urlValue = new JLabel(controller.getApplicationUri().toString());
        urlValue.setForeground(TEXT_PRIMARY);
        urlValue.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        endpoint.add(urlLabel, BorderLayout.WEST);
        endpoint.add(urlValue, BorderLayout.CENTER);
        card.add(endpoint, BorderLayout.NORTH);

        JPanel actions = new JPanel(new GridLayout(1, 3, 12, 0));
        actions.setOpaque(false);
        startButton = new ActionButton(text("button.start"), ACCENT, Color.WHITE);
        stopButton = new ActionButton(text("button.stop"), new Color(231, 235, 241), DANGER);
        openButton = new ActionButton(text("button.open"), SUCCESS, Color.WHITE);
        startButton.setToolTipText(text("tooltip.start"));
        stopButton.setToolTipText(text("tooltip.stop"));
        openButton.setToolTipText(text("tooltip.open"));
        startButton.addActionListener(event -> runDockerOperation(true));
        stopButton.addActionListener(event -> runDockerOperation(false));
        openButton.addActionListener(event -> openBrowser());
        actions.add(startButton);
        actions.add(stopButton);
        actions.add(openButton);
        card.add(actions, BorderLayout.CENTER);

        JPanel utilityRow = new JPanel(new BorderLayout(10, 0));
        utilityRow.setOpaque(false);
        progressBar = new JProgressBar();
        progressBar.setIndeterminate(true);
        progressBar.setVisible(false);
        progressBar.setPreferredSize(new Dimension(180, 5));
        utilityRow.add(progressBar, BorderLayout.CENTER);
        refreshButton = new JButton(text("button.refresh"));
        refreshButton.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        refreshButton.addActionListener(event -> refreshStatus(true));
        utilityRow.add(refreshButton, BorderLayout.EAST);
        card.add(utilityRow, BorderLayout.SOUTH);
        return card;
    }

    private JPanel buildLogCard() {
        JPanel card = createCard(new BorderLayout(0, 10));
        JPanel heading = new JPanel(new BorderLayout());
        heading.setOpaque(false);
        JLabel title = new JLabel(text("log.title"));
        title.setForeground(TEXT_PRIMARY);
        title.setFont(title.getFont().deriveFont(Font.BOLD, 14f));
        JButton clearButton = new JButton(text("button.clearLog"));
        clearButton.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        clearButton.addActionListener(event -> logArea.setText(""));
        heading.add(title, BorderLayout.WEST);
        heading.add(clearButton, BorderLayout.EAST);
        card.add(heading, BorderLayout.NORTH);

        logArea = new JTextArea();
        logArea.setEditable(false);
        logArea.setLineWrap(true);
        logArea.setWrapStyleWord(true);
        logArea.setBackground(new Color(248, 250, 253));
        logArea.setForeground(TEXT_PRIMARY);
        logArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        logArea.setBorder(new EmptyBorder(10, 12, 10, 12));
        JScrollPane scroll = new JScrollPane(logArea);
        scroll.setBorder(BorderFactory.createLineBorder(new Color(222, 228, 236)));
        card.add(scroll, BorderLayout.CENTER);
        return card;
    }

    private JPanel createCard(BorderLayout layout) {
        JPanel card = new JPanel(layout);
        card.setBackground(CARD_BACKGROUND);
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(222, 228, 236)),
            new EmptyBorder(18, 18, 18, 18)
        ));
        return card;
    }

    private void runDockerOperation(boolean start) {
        String operation = text(start ? "operation.start" : "operation.stop");
        setOperationRunning(true);
        appendLog(format("log.operationStarted", operation));

        CompletableFuture
            .supplyAsync(start ? controller::start : controller::stop, executor)
            .whenComplete((result, error) -> SwingUtilities.invokeLater(() -> {
                setOperationRunning(false);
                if (error != null) {
                    showError(operation, rootMessage(error));
                } else if (!result.isSuccess()) {
                    appendCommandOutput(result.output);
                    showError(operation, result.describe());
                } else {
                    appendCommandOutput(result.output);
                    appendLog(format("log.operationSucceeded", operation));
                }
                refreshStatus(true);
            }));
    }

    private void openBrowser() {
        try {
            controller.openBrowser();
            appendLog(format("log.browserOpened", controller.getApplicationUri()));
        } catch (IOException exception) {
            showError(text("operation.open"), exception.getMessage());
        }
    }

    private void refreshStatus(boolean showCheckingState) {
        if (operationRunning || !checkingStatus.compareAndSet(false, true)) {
            return;
        }
        if (showCheckingState) {
            applyState(DockerController.ContainerState.CHECKING);
        }

        CompletableFuture
            .supplyAsync(controller::checkStatus, executor)
            .whenComplete((result, error) -> SwingUtilities.invokeLater(() -> {
                checkingStatus.set(false);
                if (error != null) {
                    applyState(DockerController.ContainerState.UNAVAILABLE);
                    appendLog(format("log.statusFailed", rootMessage(error)));
                    return;
                }
                DockerController.ContainerState previous = currentState;
                applyState(result.state);
                if (previous != result.state || showCheckingState) {
                    appendLog(format("log.statusChanged", stateText(result.state)));
                    if (result.state == DockerController.ContainerState.UNAVAILABLE
                            && !result.output.isBlank()) {
                        appendCommandOutput(result.output);
                    }
                }
            }));
    }

    private void setOperationRunning(boolean running) {
        operationRunning = running;
        progressBar.setVisible(running);
        startButton.setEnabled(
            !running && currentState != DockerController.ContainerState.RUNNING
        );
        stopButton.setEnabled(
            !running && currentState == DockerController.ContainerState.RUNNING
        );
        openButton.setEnabled(
            !running && currentState == DockerController.ContainerState.RUNNING
        );
        refreshButton.setEnabled(!running);
    }

    private void applyState(DockerController.ContainerState state) {
        currentState = state;
        statusValue.setText("●  " + stateText(state));
        Color foreground;
        Color background;
        if (state == DockerController.ContainerState.RUNNING) {
            foreground = SUCCESS;
            background = new Color(226, 246, 237);
        } else if (state == DockerController.ContainerState.STOPPED) {
            foreground = TEXT_SECONDARY;
            background = new Color(234, 238, 244);
        } else if (state == DockerController.ContainerState.UNAVAILABLE) {
            foreground = DANGER;
            background = new Color(252, 231, 234);
        } else {
            foreground = WARNING;
            background = new Color(253, 242, 220);
        }
        statusValue.setForeground(foreground);
        statusValue.setBackground(background);
        if (startButton != null) {
            setOperationRunning(operationRunning);
        }
    }

    private String stateText(DockerController.ContainerState state) {
        return text("status." + state.name().toLowerCase(Locale.ROOT));
    }

    private void appendLog(String message) {
        String normalized = message == null ? "" : message.trim();
        if (normalized.isEmpty()) {
            return;
        }
        logArea.append("[" + LocalTime.now().format(LOG_TIME) + "] " + normalized + System.lineSeparator());
        logArea.setCaretPosition(logArea.getDocument().getLength());
    }

    private void appendCommandOutput(String output) {
        if (output == null || output.isBlank()) {
            return;
        }
        for (String line : output.strip().split("\\R")) {
            appendLog("  " + line);
        }
    }

    private void showError(String operation, String details) {
        String message = format("error.operation", operation, details == null ? "" : details);
        appendLog(message);
        JOptionPane.showMessageDialog(frame, message, text("error.title"), JOptionPane.ERROR_MESSAGE);
    }

    private String text(String key) {
        return messages.getString(key);
    }

    private String format(String key, Object... values) {
        return MessageFormat.format(text(key), values);
    }

    private static String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }

    static Path locateRepositoryRoot() {
        String configured = System.getProperty("enhandiy.repoRoot");
        if (configured != null && !configured.isBlank()) {
            Path candidate = Paths.get(configured).toAbsolutePath().normalize();
            if (DockerController.isRepositoryRoot(candidate)) {
                return candidate;
            }
        }

        Path current = Paths.get("").toAbsolutePath().normalize();
        while (current != null) {
            if (DockerController.isRepositoryRoot(current)) {
                return current;
            }
            current = current.getParent();
        }
        return null;
    }

    private static void runSelfTest() {
        try {
            check(
                DockerController.parseHttpPort(
                    "services:\n  web:\n    ports:\n      - \"37555:80\"\n  worker:\n    image: example\n"
                ) == 37555,
                "quoted port"
            );
            check(
                DockerController.parseHttpPort(
                    "services:\n  web:\n    ports:\n      - '127.0.0.1:8080:80/tcp'\n"
                ) == 8080,
                "bound port"
            );
            check(
                DockerController.parseHttpPort(
                    "services:\n  web:\n    # - \"9999:80\"\n    ports:\n      - \"9443:443\"\n"
                ) == 80,
                "fallback port"
            );
            Path root = locateRepositoryRoot();
            check(root != null, "repository root");
            DockerController controller = new DockerController(root);
            check(Files.isRegularFile(controller.composeFile), "compose file");
            check(controller.getApplicationUri().getHost().equals("localhost"), "application URI");
            ResourceBundle japanese = ResourceBundle.getBundle(
                "i18n.DockerManagerMessages",
                Locale.JAPANESE
            );
            for (String key : Arrays.asList(
                "app.title",
                "button.start",
                "button.stop",
                "button.open",
                "status.running",
                "error.operation"
            )) {
                check(japanese.containsKey(key), "message key: " + key);
            }
            System.out.println("Docker manager self-test passed: " + controller.getApplicationUri());
        } catch (Exception exception) {
            System.err.println("Docker manager self-test failed: " + exception.getMessage());
            System.exit(1);
        }
    }

    private static void runIntegrationTest() {
        Path root = locateRepositoryRoot();
        if (root == null) {
            System.err.println("Docker manager integration test failed: repository root");
            System.exit(1);
        }

        DockerController controller = new DockerController(root);
        DockerController.StatusResult initial = controller.checkStatus();
        if (initial.state == DockerController.ContainerState.UNAVAILABLE) {
            System.err.println("Docker manager integration test failed: " + initial.output);
            System.exit(1);
        }

        boolean initiallyRunning = initial.state == DockerController.ContainerState.RUNNING;
        RuntimeException testFailure = null;
        try {
            DockerController.CommandResult first = initiallyRunning
                ? controller.stop()
                : controller.start();
            checkIntegrationResult(first, initiallyRunning ? "stop" : "start");
            DockerController.StatusResult changed = controller.checkStatus();
            check(
                changed.state == (initiallyRunning
                    ? DockerController.ContainerState.STOPPED
                    : DockerController.ContainerState.RUNNING),
                "changed Docker state"
            );
        } catch (RuntimeException exception) {
            testFailure = exception;
        }

        DockerController.StatusResult beforeRestore = controller.checkStatus();
        if (beforeRestore.state != initial.state) {
            DockerController.CommandResult restore = initiallyRunning
                ? controller.start()
                : controller.stop();
            checkIntegrationResult(restore, initiallyRunning ? "restart" : "restop");
        }
        DockerController.StatusResult restored = controller.checkStatus();
        check(restored.state == initial.state, "restored Docker state");
        if (testFailure != null) {
            throw testFailure;
        }
        System.out.println("Docker manager integration test passed: " + restored.state);
    }

    private static void checkIntegrationResult(
            DockerController.CommandResult result,
            String operation) {
        if (!result.isSuccess()) {
            throw new IllegalStateException(operation + ": " + result.describe());
        }
    }

    private static void check(boolean condition, String label) {
        if (!condition) {
            throw new IllegalStateException(label);
        }
    }

    private static final class ActionButton extends JButton {
        private static final long serialVersionUID = 1L;
        private final Color fillColor;
        private final Color textColor;
        private boolean hover;

        private ActionButton(String label, Color fillColor, Color textColor) {
            super(label);
            this.fillColor = fillColor;
            this.textColor = textColor;
            setForeground(textColor);
            setFont(getFont().deriveFont(Font.BOLD, 14f));
            setBorder(new EmptyBorder(13, 16, 13, 16));
            setContentAreaFilled(false);
            setFocusPainted(false);
            setOpaque(false);
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            addChangeListener(event -> {
                boolean nextHover = getModel().isRollover();
                if (hover != nextHover) {
                    hover = nextHover;
                    repaint();
                }
            });
        }

        @Override
        protected void paintComponent(Graphics graphics) {
            Graphics2D canvas = (Graphics2D)graphics.create();
            canvas.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            Color base = isEnabled() ? fillColor : new Color(210, 216, 224);
            canvas.setColor(hover && isEnabled() ? base.brighter() : base);
            canvas.fillRoundRect(0, 0, getWidth(), getHeight(), 14, 14);
            canvas.dispose();
            setForeground(isEnabled() ? textColor : new Color(128, 138, 151));
            super.paintComponent(graphics);
        }
    }
}
