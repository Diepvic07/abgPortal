# Data Protection Policy

**Platform:** ABG Alumni Connect
**Last Updated:** 05/03/2026
**Version:** 1.0

> **Note:** This is an English translation provided for reference purposes only. The Vietnamese version (`data-protection-policy.vi.md`) is the legally binding version in accordance with the laws of the Socialist Republic of Vietnam.

---

## 1. Data Protection Commitment

ABG Alumni ("we", "us") is committed to protecting the personal data of all members using the ABG Alumni Connect platform. This policy is established in compliance with:

- **Decree 13/2023/ND-CP** on personal data protection
- **Cybersecurity Law 2018** (Law No. 24/2018/QH14)
- Other applicable laws and regulations of the Socialist Republic of Vietnam

We collect, store, and process personal data solely for the purpose of providing and improving the ABG alumni community connection service. All data processing activities are carried out on a lawful, transparent basis with the clear consent of users.

---

## 2. Scope of Application

This policy applies to:

- All members registered and approved on the ABG Alumni Connect platform
- Users in the process of registering an account
- Visitors to the platform's public website
- Any individual interacting with the system through platform features

This policy covers the entire lifecycle of personal data: from the point of collection, storage, and processing, through to deletion upon request or as required by regulation.

---

## 3. Categories of Data Collected

### 3.1. Basic Personal Data

Identification and contact data collected during registration and platform use:

- Full name
- Email address
- Phone number
- Role within the ABG community (member, mentor, etc.)
- Current company or organization
- Areas of expertise and skills
- Profile avatar / photo
- Personal biography (bio)

### 3.2. Sensitive Data

Data classified as sensitive under Decree 13/2023/ND-CP, collected specifically for the **Love Match** feature:

- Relationship / marital status
- Gender identity
- Dating preferences and the type of connection sought

> **Note:** Sensitive data is collected only with explicit, separate consent and is only visible to members who have opted into the Love Match feature.

### 3.3. Technical Data

Data generated during platform use:

- Authentication tokens (JWT) and session data
- IP addresses (recorded via rate limiting mechanisms)
- Browser session data
- Administrative audit logs

---

## 4. Technical Safeguards

ABG Alumni applies the following technical protection measures:

### 4.1. Database Access Control

- **Supabase Row Level Security (RLS):** Database-level security policies ensure each user can only access data they are permitted to see
- Clear separation between public and private data
- Database access granted on the principle of least privilege

### 4.2. Authentication and Authorization

- **NextAuth JWT:** Authentication tokens with a 30-day expiry, cryptographically signed
- Multi-tier permission system: member, admin, super admin
- Manual approval for new accounts before full access is granted

### 4.3. Encryption and Data Transmission

- **HTTPS:** All data is encrypted in transit
- Data at rest is encrypted by the cloud service provider
- Passwords are never stored in plain text

### 4.4. Rate Limiting

- Rate limiting applied on critical API endpoints
- Prevents brute force attacks and service abuse
- IP addresses in violation may be automatically blocked

### 4.5. Infrastructure Security

- Hosting infrastructure protected by **Vercel** with enterprise-grade security standards
- Regular security updates applied across the entire system
- Continuous monitoring for anomalous activity

---

## 5. Organizational Measures

### 5.1. Member Approval Workflow

- All new accounts require manual approval from an administrator
- Identity verification before full access is granted
- Prevents unauthorized access to the community

### 5.2. Policy Violation Account Management

- Administrators can suspend or delete accounts that violate policies
- Clear procedures for handling complaints and appeals
- Users are notified when their account is restricted

### 5.3. Audit Trail

- All administrative actions are recorded via **Discord webhook** notifications
- Logs include: timestamp, acting administrator, action taken, and affected subject
- Supports traceability in the event of an incident or complaint

### 5.4. Principle of Least Privilege

- Administrators are granted only the permissions necessary for their role
- Clear permission hierarchy between administrative roles
- Periodic review of accounts with administrative access

---

## 6. Data Breach Response

In the event of a data leak or breach, ABG Alumni will:

### 6.1. Notification to Authorities

- Notify the competent authority **within 72 hours** of discovering the incident, in accordance with **Decree 13/2023/ND-CP**
- Provide complete information about the nature, scope, and impact of the incident

### 6.2. Notification to Affected Users

- Immediately notify users whose data has been affected
- Provide guidance on additional protective measures users can take
- Maintain open communication channels throughout the incident response process

### 6.3. Investigation and Remediation

- Investigate the cause and scope of the incident
- Implement timely remediation and patching measures
- Reassess and strengthen existing security controls

### 6.4. Incident Documentation

- Fully document all incident events and response actions taken
- Retain records in accordance with legal requirements
- Apply lessons learned to improve security processes

---

## 7. Data Access and Deletion Rights

In accordance with **Decree 13/2023/ND-CP** and the **Cybersecurity Law 2018**, users have the following rights:

### 7.1. Right to Access Data

- Users can view and edit their personal information in the **Profile Settings** section
- Users may request a copy of all personal data stored about them

### 7.2. Right to Request Data Deletion

- Users may submit a request to delete all their data by emailing: **contact@abg.vn**
- Data deletion requests will be processed **within 30 days**
- Backup data will be purged **within 90 days** of the request date

### 7.3. Right to Object and Restrict Processing

- Users have the right to object to data processing for specific purposes
- Users may request restriction of processing while a complaint is under review

> **Note:** Some data may be retained where necessary for the purposes of legal compliance or dispute resolution.

---

## 8. International Data Transfers

ABG Alumni uses third-party services with servers located outside of Vietnam. Data transfers are conducted in accordance with **Decree 13/2023/ND-CP**:

| Provider | Purpose | Location |
|---|---|---|
| **Supabase** | Database hosting and storage | Cloud infrastructure |
| **Vercel** | Application hosting and image storage (Blob storage) | United States (US) |
| **Google Gemini AI** | AI-powered connection recommendation features | United States (US) |
| **Resend** | Transactional email delivery | United States (US) |

All providers listed above comply with internationally recognized industry-standard security practices. Users are informed of these data transfers through this data protection policy.

---

## 9. Data Protection Impact Assessment

In the spirit of **Decree 13/2023/ND-CP**, ABG Alumni conducts periodic impact assessments:

- Review of all data processing activities and associated risk levels
- Assessment of the security practices of third-party service providers
- Monitoring and updating in response to changes in applicable regulations
- Updating policies and procedures as required
- Impact assessment when deploying new features that involve personal data processing

---

## 10. Data Protection Contact

ABG Alumni is the **Data Controller** as defined under **Decree 13/2023/ND-CP**.

**Contact Information:**

- **Email:** contact@abg.vn
- **Address:** Read Station, Huynh Thuc Khang, Hanoi, Vietnam

For any requests, complaints, or questions relating to personal data, please contact us at the email above. We are committed to responding within **5 business days**.

---

## 11. Policy Changes

ABG Alumni reserves the right to update this policy as necessary to reflect changes in law, technology, or platform operations.

- Users will be notified of significant changes via email
- Updated versions take effect **30 days** after the notification date
- Continued use of the platform after this period constitutes acceptance of the updated policy

---

*This policy is issued by ABG Alumni and is effective from 05/03/2026.*
*The Vietnamese version is the legally binding version.*
