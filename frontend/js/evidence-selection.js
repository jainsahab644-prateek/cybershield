(() => {
  'use strict';

  const DEFAULT_CONFIG = {
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 5,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf']
  };
  const MIME_BY_EXTENSION = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf'
  };

  function extensionOf(filename) {
    return filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function typeLabel(file) {
    const extension = extensionOf(file.name);
    return extension === 'pdf' ? 'PDF' : extension.toUpperCase();
  }

  function create(root) {
    const input = root.querySelector('[data-evidence-input]');
    const list = root.querySelector('[data-evidence-preview]');
    const error = root.querySelector('[data-evidence-error]');
    const status = root.querySelector('[data-evidence-status]');
    const constraints = root.querySelector('[data-evidence-constraints]');
    const signedOut = root.querySelector('[data-evidence-signed-out]');
    let config = { ...DEFAULT_CONFIG };
    let selectedFiles = [];
    let existingCount = 0;
    let externallyDisabled = false;
    let authenticated = false;

    function updateConstraints() {
      const megabytes = config.maxFileSize / (1024 * 1024);
      if (constraints) {
        constraints.textContent = `JPG, JPEG, PNG, or PDF. Up to ${megabytes} MB per file and ${config.maxFiles} files per complaint.`;
      }
    }

    function setError(message = '') {
      if (!error) return;
      error.textContent = message;
      input?.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function render() {
      if (!list) return;
      list.replaceChildren();
      selectedFiles.forEach((file, index) => {
        const item = document.createElement('li');
        const icon = document.createElement('span');
        const details = document.createElement('div');
        const name = document.createElement('strong');
        const meta = document.createElement('small');
        const remove = document.createElement('button');
        icon.className = 'evidence-file__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = extensionOf(file.name) === 'pdf' ? 'PDF' : 'IMG';
        name.textContent = file.name;
        meta.textContent = `${typeLabel(file)} • ${formatSize(file.size)}`;
        remove.type = 'button';
        remove.className = 'evidence-file__remove';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove ${file.name}`);
        remove.addEventListener('click', () => {
          selectedFiles.splice(index, 1);
          if (input) input.value = '';
          setError();
          render();
          if (status) status.textContent = `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected.`;
        });
        details.append(name, meta);
        item.append(icon, details, remove);
        list.append(item);
      });
    }

    function validate(file) {
      const extension = extensionOf(file.name);
      if (!config.allowedExtensions.includes(extension) || file.type !== MIME_BY_EXTENSION[extension]) {
        return 'This file type is not supported. Upload JPG, PNG, or PDF files only.';
      }
      if (file.size > config.maxFileSize) {
        return `Each evidence file must be ${config.maxFileSize / (1024 * 1024)} MB or smaller.`;
      }
      return '';
    }

    function selectFiles(files) {
      setError();
      const incoming = Array.from(files);
      if (existingCount + selectedFiles.length + incoming.length > config.maxFiles) {
        setError(`You can attach up to ${config.maxFiles} evidence files.`);
        if (input) input.value = '';
        return;
      }
      for (const file of incoming) {
        const message = validate(file);
        if (message) {
          setError(message);
          if (input) input.value = '';
          return;
        }
      }
      selectedFiles.push(...incoming);
      if (input) input.value = '';
      render();
      if (status) status.textContent = `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected.`;
    }

    function updateDisabledState() {
      if (!input) return;
      input.disabled = !authenticated || externallyDisabled || existingCount >= config.maxFiles;
      if (signedOut) signedOut.hidden = authenticated;
    }

    input?.addEventListener('change', () => selectFiles(input.files));
    updateConstraints();
    updateDisabledState();

    Promise.allSettled([
      window.CyberShieldAuthApi?.getEvidenceConfig(),
      window.CyberShieldAuthApi?.getCurrentUser()
    ]).then(([configResult, userResult]) => {
      if (configResult?.status === 'fulfilled') config = configResult.value.data;
      authenticated = userResult?.status === 'fulfilled';
      updateConstraints();
      updateDisabledState();
    });

    return {
      clear() {
        selectedFiles = [];
        if (input) input.value = '';
        if (status) status.textContent = '';
        setError();
        render();
      },
      files: () => [...selectedFiles],
      isAuthenticated: () => authenticated,
      summary: () => selectedFiles.map((file) => `${file.name} (${formatSize(file.size)})`).join(', '),
      setDisabled(disabled, message = '') {
        externallyDisabled = disabled;
        updateDisabledState();
        if (message && status) status.textContent = message;
      },
      setExistingCount(count) {
        existingCount = count;
        updateDisabledState();
        if (existingCount >= config.maxFiles && status) status.textContent = 'Maximum evidence limit reached.';
      },
      getConfig: () => ({ ...config })
    };
  }

  window.CyberShieldEvidence = { create, formatSize };
})();
