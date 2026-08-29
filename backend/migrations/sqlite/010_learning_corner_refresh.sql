-- Restore a useful educational starting set only when the CMS has no articles at all.
INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,cover_image,status,is_featured,published_at,created_at,updated_at)
SELECT 'ART-'||upper(substr(hex(randomblob(4)),1,8)),c.id,'How to Pause and Check a Suspicious Message','how-to-pause-and-check-a-suspicious-message','A simple routine for checking unexpected links, urgent requests, and messages that do not feel right.','# How to Pause and Check a Suspicious Message

Unexpected messages often try to make you act before you have time to check. A familiar name or logo is not proof that a request is genuine.

## Pause before acting

- Do not open an unexpected link immediately.
- Ask whether the request makes sense in context.
- Contact the person or organisation through a channel you already trust.

## Keep important details private

Never share passwords, OTPs, PINs, CVVs, or recovery codes through an unexpected message or call.','phishing-awareness.webp','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 day')
FROM content_categories c WHERE c.slug='scam-awareness' AND NOT EXISTS(SELECT 1 FROM learning_articles);

INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,cover_image,status,is_featured,published_at,created_at,updated_at)
SELECT 'ART-'||upper(substr(hex(randomblob(4)),1,8)),c.id,'Safer Steps for an Unexpected Payment Request','safer-steps-for-an-unexpected-payment-request','Use a calm verification routine before approving an unexpected transfer or payment request.','# Safer Steps for an Unexpected Payment Request

Unexpected payment requests deserve a pause, even when they appear to come from someone familiar.

## A safer routine

1. Do not approve the request immediately.
2. Contact the person using a number or channel you already know.
3. Check the amount and recipient carefully.
4. Never reveal a UPI PIN or OTP.

If money was already sent, contact the relevant financial provider through its verified channel as quickly as possible.','payment-safety.webp','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 day')
FROM content_categories c WHERE c.slug='scam-awareness' AND (SELECT COUNT(*) FROM learning_articles)=1;

INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,cover_image,status,is_featured,published_at,created_at,updated_at)
SELECT 'ART-'||upper(substr(hex(randomblob(4)),1,8)),c.id,'Privacy Checks for Social Accounts','privacy-checks-for-social-accounts','Review what other people can see and strengthen the recovery settings on your social accounts.','# Privacy Checks for Social Accounts

Privacy and account security work best together. A few regular checks can reduce unnecessary exposure.

## Helpful checks

- Review who can see posts and profile details.
- Remove connected apps you no longer use.
- Use a unique password and multi-factor authentication.
- Check recovery email and phone information.

Treat unexpected recovery messages as suspicious until verified through the official app.','social-media-safety.webp','published',1,strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 day')
FROM content_categories c WHERE c.slug='privacy' AND (SELECT COUNT(*) FROM learning_articles)=2;

INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,cover_image,status,is_featured,published_at,created_at,updated_at)
SELECT 'ART-'||upper(substr(hex(randomblob(4)),1,8)),c.id,'Five Checks Before You Shop Online','five-checks-before-you-shop-online','Recognize pressure tactics, unusual payment requests, and seller details that deserve a closer look.','# Five Checks Before You Shop Online

A polished page does not guarantee that a seller or offer is reliable.

## Before paying

- Compare the offer with established sellers.
- Read return and contact information carefully.
- Be cautious when payment is requested outside the platform.
- Check the full checkout address.
- Save the listing, receipt, and conversation.

Avoid entering account details after following an unexpected message link.','shopping-safety.webp','published',0,strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 day')
FROM content_categories c WHERE c.slug='online-safety' AND (SELECT COUNT(*) FROM learning_articles)=3;

INSERT INTO learning_articles(public_article_id,category_id,title,slug,summary,content,cover_image,status,is_featured,published_at,created_at,updated_at)
SELECT 'ART-'||upper(substr(hex(randomblob(4)),1,8)),c.id,'What to Do After an Account Security Alert','what-to-do-after-an-account-security-alert','Respond to a security notification without following an unverified link or sharing credentials.','# What to Do After an Account Security Alert

A genuine-looking alert can still be a deceptive message. Open the official app or type the known website address yourself.

## Review safely

1. Check recent sign-ins and account activity.
2. End sessions you do not recognise.
3. Change the password from official account settings.
4. Confirm recovery email and phone details.

Do not give anyone an OTP, recovery code, or password while investigating an alert.','account-security.webp','published',0,strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'),strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')
FROM content_categories c WHERE c.slug='online-safety' AND (SELECT COUNT(*) FROM learning_articles)=4;
