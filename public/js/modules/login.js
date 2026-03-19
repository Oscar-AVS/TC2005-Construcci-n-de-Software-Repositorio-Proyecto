/**
 * Login module.
 * Handles password visibility toggle and keyboard navigation.
 */

const LoginModule = (() => {
  const byId = (id) => document.getElementById(id);

  const init = () => {
    const passwordInput = byId('loginPass');
    const togglePassButton = byId('togglePass');
    const eyeIcon = byId('eyeIcon');
    const userInput = byId('loginUser');

    if (!passwordInput || !togglePassButton || !eyeIcon) {
      return;
    }

    togglePassButton.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';

      passwordInput.type = isPassword ? 'text' : 'password';
      eyeIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });

    if (userInput) {
      userInput.addEventListener('keydown', ({ key }) => {
        if (key === 'Enter') {
          passwordInput.focus();
        }
      });
    }
  };

  return { init };
})();