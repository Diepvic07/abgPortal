# Privacy Policy

**Platform:** ABG Alumni Connect
**Last Updated:** March 05, 2026
**Version:** 1.0

> **Note:** This is an English translation provided for reference purposes only. The Vietnamese version (`privacy-policy.vi.md`) is the legally binding version in accordance with Vietnamese law (Decree No. 13/2023/ND-CP).

---

## 1. Introduction

ABG Alumni Connect ("we", "the platform") is committed to protecting the privacy and personal data of our members. This policy describes how we collect, process, store, and protect your personal information when you use the ABG Alumni Connect platform.

This Privacy Policy is built in compliance with **Decree No. 13/2023/ND-CP on Personal Data Protection** issued by the Government of Vietnam. By registering and using ABG Alumni Connect, you agree to the terms of this policy.

---

## 2. Data We Collect

We collect the following types of data during your use of the platform:

### 2.1 Personal Profile Information

| Data Type | Details |
|---|---|
| Full name | Display name on the platform |
| Email address | Used for login and communication |
| Phone number | Contact information (optional) |
| Role | Student or working professional |
| Company / Organization | Current employer (optional) |
| Expertise | Professional field, skills |
| Interests | Personal areas of interest |
| Bio | Short self-description |
| Avatar image | Stored on Vercel Blob (US-based CDN) |

### 2.2 Authentication Data

- **Google OAuth:** Public profile data from your Google account (name, email, avatar) when signing in with Google
- **Magic Link:** Temporary authentication tokens sent via email for passwordless login
- **Session data:** JWT tokens with a 30-day expiry to maintain your login state

### 2.3 Platform Activity Data

- Connection request history and connection status
- AI-generated match suggestion history
- Bug reports submitted through the platform

### 2.4 Love Match Data (optional, opt-in only)

The Love Match feature is entirely optional and only activated when you explicitly consent to participate. Data collected includes:

- Current relationship status
- Gender
- Dating preferences

You may withdraw consent and delete your Love Match data at any time from your account settings.

### 2.5 Technical Data

- Essential cookies (see Section 9)
- localStorage data (see Section 9)

---

## 3. Purposes of Processing

We process your personal data for the following purposes:

| Purpose | Description |
|---|---|
| Member matching | Suggest connections between alumni based on expertise, interests, and goals |
| Community building | Support the growth of the ABG Alumni network |
| AI-powered suggestions | Use Gemini AI to generate personalized and relevant connection suggestions |
| Love Match feature | Connect members with compatible romantic interests (opt-in only) |
| Platform improvement | Analyze and improve service quality and features |
| Notifications | Send email notifications about connections and platform updates |
| Security | Detect and prevent fraudulent or abusive behavior |

---

## 4. Legal Basis for Processing

Processing of your personal data is carried out on the following legal bases under **Decree No. 13/2023/ND-CP**:

- **Consent (Article 11):** You provide explicit consent when registering an account and when activating optional features (such as Love Match)
- **Performance of contract:** Processing necessary to provide the alumni connection service you have registered for
- **Legitimate interests:** Improving platform security and preventing misuse

You have the right to withdraw your consent at any time without affecting the lawfulness of processing carried out prior to withdrawal.

---

## 5. Data Sharing

**We do not sell your personal data to any third party.**

Data is shared only with the following essential service providers, solely for the purpose of operating the platform:

| Provider | Purpose | Data Involved |
|---|---|---|
| **Supabase** | Database hosting, user authentication | Profile data, session data, connection history |
| **Vercel** | Platform hosting, avatar storage (Blob) | Avatar images, application data |
| **Google Gemini AI** | AI processing for connection suggestion features | Profile information (anonymized where possible) |
| **Resend** | Email delivery (magic links, new connection alerts) | Email address, notification content |

All service providers are bound by data processing agreements and are only permitted to process data according to our instructions.

---

## 6. Cross-Border Data Transfers

In accordance with **Article 25 of Decree No. 13/2023/ND-CP**, we disclose that your data may be transferred to and processed outside of Vietnam:

| Provider | Country / Region | Purpose |
|---|---|---|
| **Supabase** | Cloud infrastructure (Singapore / US region) | Primary database storage |
| **Vercel Blob** | United States (global CDN) | Avatar image storage |
| **Google AI / Gemini** | United States | AI processing for matching features |
| **Resend** | United States | Email delivery service |

All of these providers comply with international security standards and maintain appropriate data protection measures. We ensure that cross-border data transfers are conducted with protections equivalent to or exceeding Vietnamese standards.

---

## 7. Data Retention

- **While account is active:** Data is retained to provide the full service
- **After account deletion:** Personal data is deleted within **30 days** of receiving a valid account deletion request
- **Backups:** Backup copies containing your data are fully purged within **90 days**
- **Love Match data:** Deleted immediately when you deactivate the feature

Some data may be retained longer if required by law (e.g., financial transaction records where applicable).

---

## 8. Your Data Subject Rights

Under **Decree No. 13/2023/ND-CP**, you have the following rights over your personal data:

| Right | Description |
|---|---|
| **Right of access** | Request to view the personal data we hold about you |
| **Right to rectification** | Request correction of inaccurate or incomplete information |
| **Right to erasure** | Request deletion of your account and all associated data |
| **Right to object** | Object to processing of your data for specific purposes |
| **Right to data portability** | Receive a copy of your data in a machine-readable format |
| **Right to withdraw consent** | Revoke consent granted at any time |

**To exercise your rights, contact:** contact@abg.vn

We will respond within **15 working days** of receiving a valid request.

---

## 9. Cookies and LocalStorage

We use only **essential** cookies and local storage data necessary for platform operation. **No third-party tracking cookies are used.**

| Name | Type | Purpose | Duration |
|---|---|---|---|
| `locale` | Cookie | Store language preference (VI/EN) | Session |
| `abg-locale` | localStorage | Store language preference locally | Persistent |
| NextAuth session cookie | Cookie (HTTP-only) | Maintain secure login state | 30 days |

We do **not** use:
- Analytics cookies (Google Analytics, etc.)
- Advertising cookies
- Third-party behavioral tracking cookies

---

## 10. Data Security

We apply the following technical and organizational security measures:

- **HTTPS encryption:** All data in transit is encrypted using TLS/HTTPS
- **Row Level Security (RLS):** Supabase RLS ensures each user can only access their own data
- **Short-lived JWT tokens:** Authentication tokens expire after 30 days and are signed with a secret key
- **Rate limiting:** Request rate limits to prevent brute-force attacks and API abuse
- **Secure credential handling:** No passwords stored — authentication uses OAuth and Magic Links only
- **Access controls:** Only authorized personnel can access production data

While we apply best-practice security measures, no system is completely secure. In the event of a data breach affecting your rights, we will notify you and relevant authorities in accordance with applicable law.

---

## 11. Children

ABG Alumni Connect is a platform for alumni aged **18 and above**. We do not knowingly collect personal information from individuals under the age of 18.

If you become aware of a user account belonging to someone under 18, please contact us immediately at contact@abg.vn so that we can take appropriate action.

---

## 12. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in our operations, technology, or legal requirements.

When material changes are made:
- A notice will be displayed on the platform
- A notification email will be sent to your registered email address
- The "Last Updated" date at the top of this page will be revised

Continued use of the platform after a policy update constitutes acceptance of the revised policy.

---

## 13. Contact Us

If you have any questions, complaints, or requests relating to this Privacy Policy or your personal data, please contact:

**ABG Alumni Connect**
Email: **contact@abg.vn**
Address: Read Station, Huynh Thuc Khang, Hanoi, Vietnam

We are committed to responding within **15 working days** of receiving your request.

If you are not satisfied with how we handle your complaint, you have the right to file a complaint with the **Ministry of Public Security** — the personal data protection authority in Vietnam under Decree No. 13/2023/ND-CP.

---

*This English translation is provided for reference only. The Vietnamese version is the legally binding official version, effective from March 05, 2026.*
