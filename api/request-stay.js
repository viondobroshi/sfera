export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      name = '',
      phone = '',
      email = '',
      room = '',
      guests = '',
      checkIn = '',
      checkOut = '',
      message = '',
      website = ''
    } = body;

    // Honeypot field: silently accept likely bot submissions.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !phone || !email || !room || !checkIn || !checkOut) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    if (String(checkOut) <= String(checkIn)) {
      return res.status(400).json({ ok: false, error: 'Invalid dates' });
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ ok: false, error: 'Make webhook is not configured' });
    }

    const payload = {
      source: 'Sfera website',
      property: 'PRI Aparthotel',
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).trim(),
      room: String(room).trim(),
      guests: String(guests).trim(),
      checkIn: String(checkIn).trim(),
      checkOut: String(checkOut).trim(),
      message: String(message || '').trim(),
      emailDestination: 'prishtinacityapartments@gmail.com',
      submittedAt: new Date().toISOString()
    };

    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('Make webhook failed', r.status, txt);
      return res.status(502).json({ ok: false, error: 'Could not deliver request' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('request-stay error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
