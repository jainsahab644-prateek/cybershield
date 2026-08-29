'use strict';

const categories = {
  financial_fraud: [
    'upi_fraud', 'online_banking_fraud', 'card_fraud', 'investment_scam',
    'shopping_fraud', 'payment_link_scam', 'qr_scam', 'wallet_fraud',
    'loan_scam', 'job_scam', 'other_financial_fraud'
  ],
  safety_related: [
    'online_harassment', 'cyber_bullying', 'impersonation', 'threatening_messages',
    'fake_profile', 'account_misuse', 'privacy_violation', 'other_safety_concern'
  ],
  other_cybercrime: [
    'phishing', 'fake_website', 'account_compromise', 'email_scam',
    'social_media_scam', 'malware_incident', 'identity_impersonation',
    'marketplace_scam', 'suspicious_website', 'other_cybercrime'
  ]
};

const categoryLabels = {
  financial_fraud: 'Financial Fraud',
  safety_related: 'Safety Related Cybercrime',
  other_cybercrime: 'Other Cybercrime'
};

module.exports = { categories, categoryLabels };
