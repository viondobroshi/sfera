export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      name = '',
      email = '',
      phone = '',
      location = '',
      propertyType = '',
      units = '',
      status = '',
      link = '',
      opportunity = '',
      website = ''
    } = body;

    // Honeypot field: silently accept likely bot submissions.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !email || !location || !propertyType) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ ok: false, error: 'Invalid email address' });
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ ok: false, error: 'Make webhook is not configured' });
    }

    const submittedAt = new Date().toISOString();
    const clean = (value) => String(value || '').trim();
    const details = `NEW WEBSITE PROPERTY LEAD

Name / company: ${clean(name)}
Email: ${normalizedEmail}
Phone: ${clean(phone) || 'Not provided'}
Location: ${clean(location)}
Property type: ${clean(propertyType)}
Units: ${clean(units) || 'Not provided'}
Status: ${clean(status) || 'Not provided'}
Property link / plans: ${clean(link) || 'Not provided'}

Opportunity:
${clean(opportunity) || 'No additional details provided'}

Submitted: ${submittedAt}`;

    const payload = {
      source: 'Sfera website',
      leadType: 'Property lead',
      name: clean(name),
      email: normalizedEmail,
      phone: clean(phone),
      location: clean(location),
      propertyType: clean(propertyType),
      units: clean(units),
      status: clean(status),
      link: clean(link),
      opportunity: clean(opportunity),
      commentText: details,
      emailBody: details,
      submittedAt
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      console.error('Make webhook failed', response.status, responseText);
      return res.status(502).json({ ok: false, error: 'Could not deliver property' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('submit-property error', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
