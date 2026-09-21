export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      property: propertyKey = 'pri',
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

    const properties = {"pri":{"name":"PRI Aparthotel","rooms":["No preference","101","102","201","202","203","204","205","206","301","302","303","304","305","306","401","402","403","404","405"]},"pca":{"name":"Prishtina City Apartments","rooms":["No preference","PCA - Room 101","PCA - Room 102","PCA - Room 103 & 202","PCA - Room 104","PCA - Room 105 & 204","PCA - Room 106 & 205","PCA - Room 107 & 206","PCA - Room 108 & 207","PCA - Room 201","PCA - Room 203","PCA - Room 301","PCA - Room 302","PCA - Room 303","PCA - Room 304","PCA - Room 305","PCA - Room 306","PCA - Room 401","PCA - Room 402"]},"pca2":{"name":"Prishtina City Apartments 2","rooms":["No preference","Nartel 115-1","Nartel 115-2","Nartel 19","Nartel 28","Nartel 51","Nartel 52","Nartel 61","Nartel 62","Nartel 66","Nartel 89"]},"agara":{"name":"Agara Stays","rooms":["No preference", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"]},"hilltop":{"name":"Villa Hilltop","rooms":["No preference","Entire villa"]}};
    const selectedProperty = Object.hasOwn(properties, propertyKey) ? properties[propertyKey] : null;
    if (!selectedProperty || !selectedProperty.rooms.includes(String(room)) || !/^[1-8]$/.test(String(guests))) {
      return res.status(400).json({ok:false,error:'Please select a valid property, room preference and guest count'});
    }
    const property = selectedProperty.name;
    const apartmentNames = {"Nartel 19": "Silver Central Apartment", "Nartel 28": "Soft Stay Apartment", "Nartel 51": "Sonder Apartment", "Nartel 52": "Black Modern Apartment", "Nartel 61": "Blue Boutique Apartment", "Nartel 62": "Serene Apartment", "Nartel 66": "Crème Central Apartment", "Nartel 89": "Cinema Room Apartment", "Nartel 115-1": "Prishtina City Penthouse", "Nartel 115-2": "Cloud 19 Apartment"};
    const roomLabel = propertyKey === "pca2" && apartmentNames[room] ? apartmentNames[room] + " (" + room + ")" : room;
    const guestEmail = String(email).trim();
    const guestPhone = String(phone).replace(/[\s().-]/g, '');
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(guestEmail) ||
        !/^\+[1-9]\d{7,14}$/.test(guestPhone) ||
        !['on', true].includes(privacyConsent)) {
      return res.status(400).json({ ok: false, error: 'Please provide a valid email, an international phone number and consent' });
    }

    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !Number.isNaN(new Date(value).getTime()) && new Date(value).toISOString().slice(0,10) === value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkIn)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(checkOut)) ||
        String(checkOut) <= String(checkIn) ||
        String(checkIn) < new Date().toISOString().slice(0,10) ||
        !validDate(checkIn) || !validDate(checkOut)) {
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
    const acknowledgementEmail = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#171717;line-height:1.6"><h2>Sfera — request received</h2><p>Hi ${escapeHtml(String(name).trim())},</p><p>Thank you for your stay request. We have received the following details:</p><p><strong>Property:</strong> ${escapeHtml(property)}<br><strong>Room:</strong> ${escapeHtml(roomLabel)}<br><strong>Check-in:</strong> ${escapeHtml(checkIn)}<br><strong>Check-out:</strong> ${escapeHtml(checkOut)}<br><strong>Guests:</strong> ${escapeHtml(guests || 'Not provided')}</p><p><strong>Your booking is not confirmed yet.</strong> Our team will check availability and contact you to confirm the details.</p><p>You can reply to this email or <a href="https://wa.me/38348101070">chat with Sfera on WhatsApp</a> if you need to update your request.</p><p>Thank you,<br>The Sfera team</p></div>`;
    const acknowledgementWhatsAppBody = JSON.stringify({
      channelId: 534453,
      message: {
        type: 'whatsapp_template',
        template: {
          id: 47577361,
          name: 'follow_up', languageCode: 'en',
          components: [{ type: 'body', parameters: [
            { type: 'text', text: String(name).trim().replace(/\s+/g, ' ').slice(0, 100) },
            { type: 'text', text: `we have received your Sfera stay request for ${property}, ${String(roomLabel).trim()}, ${String(checkIn).trim()} to ${String(checkOut).trim()}. Your booking is not confirmed yet. Our team will check availability and contact you to confirm the details. You can reply here with any questions.` }
          ] }]
        }
      }
    });
    const details = `NEW WEBSITE STAY REQUEST

Property: ${property}
Room: ${String(roomLabel).trim()}
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
      property,
      name: String(name).trim(),
      phone: guestPhone,
      email: guestEmail,
      room: String(roomLabel).trim(),
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
