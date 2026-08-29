# Hackathon citizen test scenarios

Use fictional information only. These scenarios exercise the category assistant and manual journey without real personal, financial or authentication data.

| Scenario | Fictional description | Expected suggestion |
| --- | --- | --- |
| Suspicious payment link | I received a message saying my electricity would be disconnected unless I immediately paid through a link. | Financial Fraud / Payment Link Scam |
| Impersonation | Someone created an Instagram profile using my fictional name and sample photos. | Safety Related Cybercrime / Impersonation |
| Account compromise | I entered a fictional password on a test website and now I cannot access my demo account. | Other Cybercrime / Account Compromise |
| Online shopping | I ordered a fictional product from a test website but the seller disappeared after the demo payment. | Financial Fraud / Online Shopping Fraud |
| Threatening messages | I received repeated fictional threatening messages on a test social profile. | Safety Related Cybercrime / Threatening Messages |

Also verify low-confidence text, fewer than 20 characters, more than 2,000 characters, irrelevant text, `AI_PROVIDER=disabled`, and an unavailable/invalid OpenAI response. In every failure case, manual category selection must remain available.
