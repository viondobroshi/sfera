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
      website = '',
      privacyConsent = '',
      acknowledgementVersion = ''
    } = body;

    // Honeypot field: silently accept likely bot submissions.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !phone || !email || !room || !checkIn || !checkOut) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const guestEmail = String(email).trim();
    const guestPhone = String(phone).replace(/[\s().-]/g, '');
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(guestEmail) ||
        !/^\+[1-9]\d{7,14}$/.test(guestPhone) ||
        !['on', true].includes(privacyConsent)) {
      return res.status(400).json({ ok: false, error: 'Please provide a valid email, an international phone number and consent' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkIn)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(checkOut)) ||
        String(checkOut) <= String(checkIn)) {
      return res.status(400).json({ ok: false, error: 'Invalid dates' });
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ ok: false, error: 'Make webhook is not configured' });
    }

    const submittedAt = new Date().toISOString();
    const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const acknowledgementEnabled = acknowledgementVersion === 'stay-v1';
    const acknowledgementEmail = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#171717;line-height:1.6"><h2>Sfera — request received</h2><p>Hi ${escapeHtml(String(name).trim())},</p><p>Thank you for your stay request. We have received the following details:</p><p><strong>Property:</strong> PRI Aparthotel<br><strong>Room:</strong> ${escapeHtml(room)}<br><strong>Check-in:</strong> ${escapeHtml(checkIn)}<br><strong>Check-out:</strong> ${escapeHtml(checkOut)}<br><strong>Guests:</strong> ${escapeHtml(guests || 'Not provided')}</p><p><strong>Your booking is not confirmed yet.</strong> Our team will check availability and contact you to confirm the details.</p><p>You can reply to this email or <a href="https://wa.me/38348101070">chat with Sfera on WhatsApp</a> if you need to update your request.</p><p>Thank you,<br>The Sfera team</p></div>`;
    const acknowledgementWhatsAppBody = JSON.stringify({
      channelId: 534453,
      message: {
        type: 'whatsapp_template',
        template: {
          id: 47577361,
          name: 'follow_up', languageCode: 'en',
          components: [{ type: 'body', parameters: [
            { type: 'text', text: String(name).trim().replace(/\s+/g, ' ').slice(0, 100) },
            { type: 'text', text: `we have received your Sfera stay request for PRI Aparthotel, ${String(checkIn).trim()} to ${String(checkOut).trim()}. Your booking is not confirmed yet. Our team will check availability and contact you to confirm the details. You can reply here with any questions.` }
          ] }]
        }
      }
    });
    const details = `NEW WEBSITE STAY REQUEST

Property: PRI Aparthotel
Room: ${String(room).trim()}
Name: ${String(name).trim()}
Email: ${String(email).trim()}
Phone: ${String(phone).trim()}
Guests: ${String(guests).trim() || 'Not provided'}
Check-in: ${String(checkIn).trim()}
Check-out: ${String(checkOut).trim()}

Message:
${String(message || '').trim() || 'No message provided'}

Submitted: ${submittedAt}`;

    const payload = {
      source: 'Sfera website',
      leadType: 'Stay request',
      property: 'PRI Aparthotel',
      name: String(name).trim(),
      phone: guestPhone,
      email: guestEmail,
      room: String(room).trim(),
      guests: String(guests).trim(),
      checkIn: String(checkIn).trim(),
      checkOut: String(checkOut).trim(),
      message: String(message || '').trim(),
      commentText: details,
      emailBody: details,
      submittedAt,
      acknowledgementVersion: acknowledgementEnabled ? 'stay-v1' : '',
      acknowledgementEmail,
      acknowledgementWhatsAppBody
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
