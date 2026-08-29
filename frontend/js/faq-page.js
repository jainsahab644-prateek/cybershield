(() => {
  'use strict';

  const api = window.CyberShieldApi;
  const form = document.querySelector('#faq-filters');
  const list = document.querySelector('#faq-list');
  const live = document.querySelector('#faq-live');
  const empty = document.querySelector('#faq-empty');
  const categorySelect = document.querySelector('#faq-category-select');
  const chipsContainer = document.querySelector('#faq-topic-chips');
  const clearBtn = document.querySelector('#faq-clear-btn');

  let allFaqs = [];
  let selectedCategory = '';

  const fallbackFaqs = [
    {
      category: 'Financial Fraud',
      question: 'What should I do if I receive a suspicious payment link?',
      answer: 'Do not click the link or enter any UPI PIN, card number, or OTP. Verify the sender through an official phone number or trusted channel before taking any action. If you already sent money, contact your bank immediately to freeze the transaction and file a report on CyberShield.'
    },
    {
      category: 'Phishing',
      question: 'How can I recognize a phishing email or message?',
      answer: 'Phishing messages often create false urgency (e.g., "Account suspended in 24 hours"), contain slight typos in domain names, ask for confidential credentials or OTPs, or offer unexpected rewards. Always inspect the full URL carefully before logging in.'
    },
    {
      category: 'Account Security',
      question: 'What information should I never share through a message?',
      answer: 'Never share your One-Time Passwords (OTPs), UPI PINs, passwords, CVV numbers, bank account numbers, or password recovery backup codes with anyone—even if they claim to represent your bank or a government official.'
    },
    {
      category: 'Incident Recovery',
      question: 'What should I do if an online account may have been compromised?',
      answer: 'Immediately change your password from a secure device, log out of all active sessions, enable Multi-Factor Authentication (MFA), and check for unauthorized recovery phone numbers or email addresses linked to your account.'
    },
    {
      category: 'Service Boundaries',
      question: 'Does CyberShield submit reports to police?',
      answer: 'CyberShield provides public cyber safety guidance, automated risk analysis, and complaint drafting assistance. For official legal law enforcement action in India, CyberShield helps you prepare your incident details so you can submit them to the National Cyber Crime Reporting Portal (cybercrime.gov.in) or call 1930.'
    }
  ];

  function render(items) {
    list.replaceChildren();

    items.forEach((faq, index) => {
      const article = document.createElement('article');
      article.className = 'faq-item';

      const h2 = document.createElement('h2');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'faq-question-btn';
      const answerId = `faq-answer-${index}`;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', answerId);

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'faq-question-content';

      if (faq.category) {
        const badge = document.createElement('span');
        badge.className = 'faq-category-badge';
        badge.textContent = faq.category;
        contentWrapper.append(badge);
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'faq-question-title';
      titleSpan.textContent = faq.question;
      contentWrapper.append(titleSpan);

      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'faq-toggle-icon';
      toggleIcon.setAttribute('aria-hidden', 'true');
      toggleIcon.textContent = '+';

      button.append(contentWrapper, toggleIcon);

      const answerDiv = document.createElement('div');
      answerDiv.id = answerId;
      answerDiv.className = 'faq-answer';
      answerDiv.hidden = true;

      const p = document.createElement('p');
      p.textContent = faq.answer;
      answerDiv.append(p);

      button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isOpen));
        answerDiv.hidden = isOpen;
        toggleIcon.textContent = isOpen ? '+' : '−';
      });

      h2.append(button);
      article.append(h2, answerDiv);
      list.append(article);
    });

    if (empty) empty.hidden = items.length > 0;

    if (live) {
      live.innerHTML = items.length
        ? `<span class="faq-live-dot" aria-hidden="true"></span> Showing <strong>${items.length}</strong> answer${items.length === 1 ? '' : 's'}`
        : `<span class="faq-live-dot faq-live-dot--empty" aria-hidden="true"></span> No answers match your search`;
    }
  }

  function filter() {
    const searchVal = form?.search?.value?.trim().toLowerCase() || '';
    const catVal = selectedCategory || categorySelect?.value || '';

    const filtered = allFaqs.filter(faq => {
      const matchesCategory = !catVal || faq.category === catVal;
      const matchesSearch = !searchVal || `${faq.question} ${faq.answer} ${faq.category || ''}`.toLowerCase().includes(searchVal);
      return matchesCategory && matchesSearch;
    });

    render(filtered);
  }

  function setupCategoryChips(categories) {
    if (!chipsContainer) return;
    chipsContainer.replaceChildren();

    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'topic-chip';
    allChip.textContent = 'All Categories';
    allChip.setAttribute('aria-pressed', String(selectedCategory === ''));
    allChip.addEventListener('click', () => {
      selectedCategory = '';
      if (categorySelect) categorySelect.value = '';
      updateChipStates();
      filter();
    });
    chipsContainer.append(allChip);

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'topic-chip';
      chip.textContent = cat;
      chip.setAttribute('aria-pressed', String(selectedCategory === cat));
      chip.addEventListener('click', () => {
        selectedCategory = cat;
        if (categorySelect) categorySelect.value = cat;
        updateChipStates();
        filter();
      });
      chipsContainer.append(chip);
    });
  }

  function updateChipStates() {
    if (!chipsContainer) return;
    chipsContainer.querySelectorAll('.topic-chip').forEach(chip => {
      const isAll = chip.textContent === 'All Categories' && selectedCategory === '';
      const isMatch = chip.textContent === selectedCategory;
      chip.setAttribute('aria-pressed', String(isAll || isMatch));
    });
  }

  async function init() {
    if (live) live.innerHTML = '<span class="faq-live-dot" aria-hidden="true"></span> Loading FAQs…';

    try {
      if (api && typeof api.request === 'function') {
        const response = await api.request('/learning/faqs?limit=100');
        if (response?.data?.faqs?.length) {
          allFaqs = response.data.faqs;
        } else {
          allFaqs = fallbackFaqs;
        }
      } else {
        allFaqs = fallbackFaqs;
      }
    } catch (err) {
      allFaqs = fallbackFaqs;
    }

    const categories = [...new Set(allFaqs.map(f => f.category).filter(Boolean))].sort();

    if (categorySelect) {
      categorySelect.replaceChildren();
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'All categories';
      categorySelect.append(defaultOption);

      categories.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        categorySelect.append(option);
      });

      categorySelect.addEventListener('change', () => {
        selectedCategory = categorySelect.value;
        updateChipStates();
        filter();
      });
    }

    setupCategoryChips(categories);

    if (form) {
      form.addEventListener('input', filter);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (form && form.search) form.search.value = '';
        selectedCategory = '';
        if (categorySelect) categorySelect.value = '';
        updateChipStates();
        filter();
      });
    }

    render(allFaqs);
  }

  init();
})();

