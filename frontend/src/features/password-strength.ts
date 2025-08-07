/**
 * パスワード強度チェック機能
 * 簡単なパスワードと短いパスワードを自動拒否
 */

// 簡単なパスワードのブラックリスト
const WEAK_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'admin', 'root', 'user', 'guest', 'test', 'demo', 'login', 'pass',
  '111111', '000000', '123123', '789456', 'qwerty123', 'password1',
  'admin123', 'root123', 'user123', 'test123', 'demo123', 'login123',
  'iloveyou', 'welcome', 'monkey', 'dragon', 'sunshine', 'master',
  '1234567890', 'abcdefgh', 'letmein', 'trustno1', 'princess',
  'football', 'baseball', 'basketball', 'superman', 'batman'
];

// 日本語の簡単なパスワード
const WEAK_PASSWORDS_JP = [
  'パスワード', 'ぱすわーど', 'password', 'あいうえお', 'かきくけこ',
  'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも',
  'やゆよ', 'らりるれろ', 'わをん', 'あああああ', 'いいいいい'
];

interface PasswordStrength {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  message: string;
  warnings: string[];
}

/**
 * パスワード強度を評価する
 */
function evaluatePasswordStrength(password: string): PasswordStrength {
  const warnings: string[] = [];
  let score = 0;
  
  // 最低長さチェック
  if (password.length < 6) {
    warnings.push('6文字以上にしてください');
    return {
      score: 0,
      level: 'weak',
      message: '短すぎます',
      warnings
    };
  }
  
  // 簡単なパスワードチェック
  const lowerPassword = password.toLowerCase();
  if (WEAK_PASSWORDS.includes(lowerPassword) || WEAK_PASSWORDS_JP.includes(password)) {
    warnings.push('よく使われるパスワードです');
    return {
      score: 0,
      level: 'weak',
      message: '危険です',
      warnings
    };
  }
  
  // 長さによるスコア加算
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;
  
  // 文字種類によるスコア加算
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15;
  
  // 日本語文字
  if (/[ひらがなカタカナ漢字]/.test(password)) score += 5;
  
  // 反復パターンチェック
  if (/(.)\1{2,}/.test(password)) {
    score -= 15;
    warnings.push('同じ文字の連続は避けてください');
  }
  
  // 連続する数字・文字チェック
  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def/.test(lowerPassword)) {
    score -= 10;
    warnings.push('連続する文字・数字は避けてください');
  }
  
  // スコアに基づくレベル決定
  let level: 'weak' | 'fair' | 'good' | 'strong';
  let message: string;
  
  if (score < 30) {
    level = 'weak';
    message = '弱い';
    if (password.length < 8) warnings.push('8文字以上推奨');
  } else if (score < 60) {
    level = 'fair';
    message = '普通';
  } else if (score < 80) {
    level = 'good';
    message = '良い';
  } else {
    level = 'strong';
    message = '強い';
  }
  
  return { score, level, message, warnings };
}

/**
 * パスワード強度UIを更新する
 */
function updatePasswordStrengthUI(
  inputId: string, 
  strengthId: string, 
  password: string
): void {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const strengthContainer = document.getElementById(strengthId);
  
  if (!input || !strengthContainer) return;
  
  if (password.length === 0) {
    strengthContainer.style.visibility = 'hidden';
    input.classList.remove('password-weak', 'password-fair', 'password-good', 'password-strong');
    return;
  }
  
  const strength = evaluatePasswordStrength(password);
  const levelElement = strengthContainer.querySelector(`#${strengthId}-level`) as HTMLElement;
  const textElement = strengthContainer.querySelector(`#${strengthId}-text`) as HTMLElement;
  
  if (!levelElement || !textElement) return;
  
  // 表示
  strengthContainer.style.visibility = 'visible';
  
  // レベル表示更新
  levelElement.className = `strength-level ${strength.level}`;
  textElement.className = `strength-text ${strength.level}`;
  textElement.textContent = strength.message;
  
  // 警告表示
  if (strength.warnings.length > 0) {
    let warningElement = strengthContainer.querySelector('.password-warning');
    if (!warningElement) {
      warningElement = document.createElement('div');
      warningElement.className = 'password-warning';
      strengthContainer.appendChild(warningElement);
    }
    warningElement.textContent = strength.warnings[0];
  } else {
    const warningElement = strengthContainer.querySelector('.password-warning');
    if (warningElement) {
      warningElement.remove();
    }
  }
  
  // 入力フィールドの境界線色更新
  input.classList.remove('password-weak', 'password-fair', 'password-good', 'password-strong');
  input.classList.add(`password-${strength.level}`);
}

/**
 * パスワードが弱すぎるかチェック
 */
function isPasswordTooWeak(password: string): boolean {
  if (password.length === 0) return false; // 空欄は許可（任意の場合）
  
  // 最低長さチェック
  if (password.length < 6) {
    return true;
  }
  
  // 簡単なパスワードチェック（大文字小文字を無視）
  const lowerPassword = password.toLowerCase();
  if (WEAK_PASSWORDS.includes(lowerPassword) || WEAK_PASSWORDS_JP.includes(password)) {
    return true; // 危険なパスワードは即座に拒否
  }
  
  const strength = evaluatePasswordStrength(password);
  return strength.level === 'weak' && strength.score < 20;
}

/**
 * 初期化処理
 */
function initPasswordStrength(): void {
  const dlkeyInput = document.getElementById('dlkeyInput') as HTMLInputElement;
  const delkeyInput = document.getElementById('delkeyInput') as HTMLInputElement;
  const replaceKeyInput = document.getElementById('replaceKeyInput') as HTMLInputElement;
  
  if (dlkeyInput) {
    dlkeyInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      updatePasswordStrengthUI('dlkeyInput', 'dlkey-strength', target.value);
    });
  }
  
  if (delkeyInput) {
    delkeyInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      updatePasswordStrengthUI('delkeyInput', 'delkey-strength', target.value);
    });
  }
  
  if (replaceKeyInput) {
    replaceKeyInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      updatePasswordStrengthUI('replaceKeyInput', 'replacekey-strength', target.value);
    });
  }
  
  // フォーム送信時の検証
  const uploadForm = document.getElementById('upload') as HTMLFormElement;
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      const dlkey = dlkeyInput?.value || '';
      const delkey = delkeyInput?.value || '';
      const replacekey = replaceKeyInput?.value || '';
      
      // DLキーが入力されている場合の強度チェック
      if (dlkey && isPasswordTooWeak(dlkey)) {
        e.preventDefault();
        alert('DLキーが弱すぎます。より複雑なキーを設定してください。');
        dlkeyInput?.focus();
        return;
      }
      
      // 削除キーの強度チェック（必須）
      if (delkey && isPasswordTooWeak(delkey)) {
        e.preventDefault();
        alert('削除キーが弱すぎます。より複雑なキーを設定してください。');
        delkeyInput?.focus();
        return;
      }
      
      // 差し替えキーの強度チェック（必須）
      if (replacekey && isPasswordTooWeak(replacekey)) {
        e.preventDefault();
        alert('差し替えキーが弱すぎます。より複雑なキーを設定してください。');
        replaceKeyInput?.focus();
        return;
      }
    });
  }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', initPasswordStrength);

// モジュールとしてエクスポート
export { evaluatePasswordStrength, updatePasswordStrengthUI, isPasswordTooWeak };