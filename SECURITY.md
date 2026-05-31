# Security Checklist

Comprehensive security checklist for production deployment.

## Pre-Deployment Security

### Environment & Configuration

- [ ] All sensitive data stored in environment variables (not in code)
- [ ] `.env` files added to `.gitignore`
- [ ] No API keys or secrets committed to repository
- [ ] Production environment variables configured on hosting platform
- [ ] `VITE_DEV_MODE` set to `false` in production
- [ ] Source maps disabled in production build
- [ ] Console logs removed from production build

### Code Security

- [ ] Input validation implemented for all user inputs
- [ ] XSS protection in place (React handles this by default)
- [ ] No `dangerouslySetInnerHTML` usage without sanitization
- [ ] No `eval()` or `Function()` constructor usage
- [ ] Dependencies audited for vulnerabilities (`npm audit`)
- [ ] All dependencies up to date
- [ ] No unused dependencies in `package.json`

### API Security

- [ ] API keys rotated before production deployment
- [ ] Rate limiting implemented for API calls
- [ ] Request timeout configured
- [ ] Retry logic with exponential backoff
- [ ] Error messages don't expose sensitive information
- [ ] API endpoints use HTTPS only

### Wallet Security

- [ ] Wallet connection uses official Solana adapters
- [ ] Transaction signing happens client-side only
- [ ] Private keys never transmitted or stored
- [ ] Transaction details verified before signing
- [ ] User confirmation required for all transactions
- [ ] Wallet disconnect functionality works properly

---

## Deployment Security

### HTTPS & SSL

- [ ] HTTPS enabled on production domain
- [ ] SSL certificate valid and not expired
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header configured
- [ ] Mixed content warnings resolved

### Security Headers

- [ ] Content-Security-Policy (CSP) configured
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-XSS-Protection enabled
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured
- [ ] Strict-Transport-Security configured

### Access Control

- [ ] Authentication system tested
- [ ] Session management secure
- [ ] Password requirements enforced (if applicable)
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow
- [ ] Admin access restricted

---

## Post-Deployment Security

### Monitoring & Logging

- [ ] Error tracking configured (Sentry)
- [ ] Security events logged
- [ ] Failed authentication attempts monitored
- [ ] Unusual activity alerts set up
- [ ] Log retention policy defined
- [ ] Logs don't contain sensitive data

### Incident Response

- [ ] Incident response plan documented
- [ ] Emergency contacts list maintained
- [ ] Backup and recovery procedures tested
- [ ] Rollback procedure documented
- [ ] Security team contact information available

### Regular Maintenance

- [ ] Dependency updates scheduled (weekly/monthly)
- [ ] Security patches applied promptly
- [ ] Vulnerability scans scheduled
- [ ] Penetration testing planned
- [ ] Security audit scheduled
- [ ] API key rotation schedule defined

---

## Security Best Practices

### API Key Management

#### Rotation Schedule

- **Helius API Key**: Rotate every 90 days
- **Analytics Keys**: Rotate every 180 days
- **Sentry DSN**: Rotate if compromised

#### Rotation Procedure

1. Generate new API key
2. Update environment variables on hosting platform
3. Test with new key in staging
4. Deploy to production
5. Revoke old key after 24 hours
6. Document rotation in security log

### Rate Limiting

Implement rate limiting for:

- API calls: 100 requests per minute per user
- Wallet connections: 5 attempts per minute
- Transaction submissions: 10 per minute per wallet
- Authentication attempts: 5 per 15 minutes

### Content Security Policy (CSP)

Current CSP configuration:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://api.mainnet-beta.solana.com https://api.helius.xyz https://www.google-analytics.com wss://*.solana.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Note**: `unsafe-inline` and `unsafe-eval` should be removed if possible. Consider using nonces or hashes for inline scripts.

### Dependency Security

#### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# Check for outdated packages
npm outdated

# Update dependencies
npm update
```

#### Automated Scanning

Enable GitHub Dependabot:

1. Go to repository Settings → Security & analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"
4. Review and merge Dependabot PRs regularly

---

## Security Testing

### Manual Testing

- [ ] Test authentication bypass attempts
- [ ] Test SQL injection (if using database)
- [ ] Test XSS vulnerabilities
- [ ] Test CSRF protection
- [ ] Test file upload vulnerabilities (if applicable)
- [ ] Test session hijacking
- [ ] Test privilege escalation

### Automated Testing

```bash
# Install security testing tools
npm install -D eslint-plugin-security

# Run security linting
npx eslint --plugin security src/
```

### Penetration Testing

Consider using:

- **OWASP ZAP**: Free security scanner
- **Burp Suite**: Professional security testing
- **Snyk**: Vulnerability scanning for dependencies

---

## Compliance & Privacy

### Data Protection

- [ ] User data minimization practiced
- [ ] Data retention policy defined
- [ ] User data deletion process implemented
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if applicable)

### GDPR Compliance (if applicable)

- [ ] User consent obtained for data collection
- [ ] Right to access data implemented
- [ ] Right to deletion implemented
- [ ] Data breach notification procedure defined
- [ ] Data processing agreement with third parties

### Accessibility

- [ ] WCAG 2.1 Level AA compliance checked
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility tested
- [ ] Color contrast ratios meet standards

---

## Security Contacts

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security contact: [your-security-email@domain.com]
3. Include detailed description and reproduction steps
4. Allow 48 hours for initial response

### Security Team

- **Security Lead**: [Name] - [email]
- **DevOps Lead**: [Name] - [email]
- **Emergency Contact**: [Phone]

---

## Security Incident Response

### Severity Levels

**Critical**: Immediate action required
- Data breach
- System compromise
- Service outage

**High**: Action required within 24 hours
- Vulnerability discovered
- Unauthorized access attempt
- API key compromise

**Medium**: Action required within 1 week
- Minor security issue
- Configuration problem
- Outdated dependency

**Low**: Action required within 1 month
- Security improvement
- Best practice violation
- Documentation update

### Response Procedure

1. **Identify**: Detect and confirm the incident
2. **Contain**: Limit the damage and prevent spread
3. **Eradicate**: Remove the threat
4. **Recover**: Restore normal operations
5. **Review**: Analyze and document lessons learned

### Emergency Actions

**If API key is compromised:**
```bash
1. Immediately revoke the compromised key
2. Generate new key
3. Update environment variables
4. Redeploy application
5. Monitor for unauthorized usage
6. Document incident
```

**If unauthorized access detected:**
```bash
1. Lock affected accounts
2. Review access logs
3. Change all credentials
4. Notify affected users
5. Investigate breach source
6. Implement additional security measures
```

---

## Security Audit Log

Maintain a log of security-related activities:

| Date | Action | Performed By | Notes |
|------|--------|--------------|-------|
| YYYY-MM-DD | API key rotation | [Name] | Scheduled rotation |
| YYYY-MM-DD | Security patch applied | [Name] | CVE-XXXX-XXXXX |
| YYYY-MM-DD | Penetration test | [Company] | No issues found |

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Web Security Cheat Sheet](https://cheatsheetseries.owasp.org/)

---

## Review Schedule

This security checklist should be reviewed:

- Before each production deployment
- After any security incident
- Quarterly for updates and improvements
- When new features are added
- When dependencies are updated

**Last Updated**: [Date]  
**Next Review**: [Date]  
**Reviewed By**: [Name]
