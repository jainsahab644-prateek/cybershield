CREATE TABLE initiatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_initiative_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 5 AND 180),
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 20 AND 500),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 20 AND 30000),
  organizer_name TEXT NOT NULL CHECK (length(organizer_name) BETWEEN 2 AND 180),
  official_source_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('awareness','workshop','training','public_campaign','cyber_safety','other')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  audience TEXT NOT NULL CHECK (length(audience) BETWEEN 2 AND 1000),
  objectives TEXT NOT NULL CHECK (length(objectives) BETWEEN 2 AND 5000),
  participation TEXT NOT NULL CHECK (length(participation) BETWEEN 2 AND 5000),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  source_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_initiatives_public_visibility ON initiatives(is_active,is_featured,start_date,end_date);
CREATE INDEX idx_initiatives_category ON initiatives(category);

INSERT INTO initiatives (
  public_initiative_id,title,slug,summary,description,organizer_name,
  official_source_url,category,start_date,end_date,audience,objectives,
  participation,is_featured,is_active,is_demo,source_verified_at,created_at,updated_at
) VALUES
('INI-'||upper(substr(hex(randomblob(4)),1,8)),'Demo Cyber Safety Awareness Week','demo-cyber-safety-awareness-week','A fictional awareness week demonstrating practical ways citizens can recognize and avoid common online risks.','This synthetic CyberShield initiative demonstrates how a public cyber-safety awareness campaign could be presented. It offers fictional learning activities about safer passwords, suspicious links, account recovery and payment-request verification.','CyberShield Demo Content Team',NULL,'awareness',date('now','-3 day'),date('now','+4 day'),'Citizens, families and first-time internet users','Build awareness of common online risks; encourage independent verification; promote safer account habits.','Read the educational guides and practise the suggested safety checks. No registration is required.',1,1,1,NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('INI-'||upper(substr(hex(randomblob(4)),1,8)),'Demo Digital Safety Workshop','demo-digital-safety-workshop','A fictional introductory workshop about protecting accounts, devices and personal information online.','This demo workshop illustrates a short, accessible learning session covering account security, device updates, privacy settings and safe responses to unexpected messages.','CyberShield Demo Content Team',NULL,'workshop',date('now','+14 day'),date('now','+14 day'),'Students, educators and community groups','Introduce practical defensive habits; explain common warning signs; encourage use of official support channels.','Review the workshop outline in CyberShield. This is demo content and has no real registration process.',1,1,1,NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
('INI-'||upper(substr(hex(randomblob(4)),1,8)),'Demo Online Fraud Awareness Campaign','demo-online-fraud-awareness-campaign','A completed fictional campaign about slowing down and verifying unexpected online payment requests.','This synthetic campaign demonstrates educational messaging about payment-link scams, impersonation and urgent money requests. It does not represent a real government campaign.','CyberShield Demo Content Team',NULL,'public_campaign',date('now','-60 day'),date('now','-30 day'),'Online shoppers and digital-payment users','Recognize urgency tactics; verify requests independently; know what information must never be shared.','Explore the related learning material in this prototype.',0,1,1,NULL,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
