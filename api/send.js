// api/send.js
const admin = require('firebase-admin');

// Service Account dari file JSON
const serviceAccount = {
    type: "service_account",
    project_id: "pzemm-6b93a",
    private_key_id: "51fc7d2dc6e14a498496ea5fe20fa2b80a410cd4",
    private_key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQa9ZmEzb/BTsd
LkgfShbiOuJ0yWOUtBi1mHyy26wJqSNK5Tbi7edcP62D/wkqXGJHtFEG1RIZulw7
YrsQ6mnUKf9fy6Bt2VXGE0a4IaFO8TJMbAFvZu8zVYTYCpCpE+5upjh+a54m1wGT
71h0QcQ0zagWTJqD5kbrdxGqxa3705QWehX51Bxfr6lzEZSw6hv7F/86xeJHozvF
TBFNkfmpKofO/nD3RuK+TiylzE5hww+XF5mdbMk96//+VCf7bMWMU0PcYKrBa83G
V33EyRJW/ebMXaXV7i5/KWrLKbcP9oei0QQZNEFba7ovkEa3cYkSAUIcX6N0KIxS
y0/mUkbnAgMBAAECggEAJQj8hI/mhmNqETHfq/uw3EtlYSZGFS75cw9hHTEuvVq6
RD09xw5KPdis3xcrDEV1S1ON0F59RGgaqozNO+DDpGlAEUgwPkTP2o4jU2XacZon
e2/3w1FxsNgB7pfWA81gYXYU9NXvuOwcwipWN/ZVxKJEu42qKUT6li3GzGcrFuO8
ExgjFxT3BmgxI1ADLg2epV+koqNvslkt7Dws/18AP7PxMO+HyOUIm9iSQF/lSvv0
UHQ+y/NyQg39yTS0RbIMlJf03YbnrQnwd7bh31pL26XK5t9rT1VfB/7jlDEyo6KZ
FeUGrcBJrbIEwjcnRySzDhGikE+pChPUkhfN0PGqiQKBgQD3m+Q9Aw6w9FlEUdaS
WZB565CQjPepkF8ngHXoGeh77MrQIKMJokLr8qSGkAVykZKepH4ZCi/Uvr+t1olh
3dWJnEG9I/WzSInPHkzzi/kN1lQy1/FMC6yB4gFpPl4kxHEn3xgHg3B90yEkxYz0
kKuFEfMn7J2s2GTXNR3budQqKQKBgQDXe/oCADvIh63wuFj4xvuelmilM2/i4MWm
hZ4WvwsuCG4TFodD7jeZ9xBLh0JrgY0w2RZb06GWY33K3ou6VcWGEkimHLJ42lRq
Ln2sMOrEFVnRC5jULGT+Fbjs9hvB2Ot1AtJUxg+/qe5865H3kKdjqceW+QbWqYzv
KbzjP0QqjwKBgQDRp1KrAmK3HD5VZcH8Kw/026uNaX7uOQsIxHGRNBawj3/umCPU
LWrio5IBSgMCzhXKc9c9Vm3HgjeEduneTtnW6dKT1tXclufw0mQvt24K9FZYspVi
YWQQmY++UAugsCBrtS+AdR+TumgO3aKLFc/VHay4OlYLmzJPMm90s7TceQKBgCEi
Cf4WxRp/akpyPhP6nKP04qBMOW78OsfxEa7Tr0djunEq7J+QWHJPH+1NHfRj1i7l
ol96OgVixOvVrkx3dci4tPz9up+EiqhM/7vjRaXi1o2jJ9uv+9NpyaZ97SSwUvwJ
9Ade8Pr6iRYiLq6PSn2zlGHtZpTJO0dm9olGqBeXAoGADVPiZhj4FvlfGGybvnWl
k0ZgvIJ8M0vUOHCgzZ+UBdlSJqaQy7f28WG8PMjKLHB+pbaM82KGK2fbuFGfotZg
jV9jkFdvZWWrxBlUc2ups3ZWlej/MlnToAwxSu5V8DY6bYC1lli11rEwywjZhD0h
eKa5gGCF3V8FuM2QrUX+tl0=
-----END PRIVATE KEY-----
`,
    client_email: "firebase-adminsdk-fbsvc@pzemm-6b93a.iam.gserviceaccount.com",
    client_id: "102058085720708364953",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40pzemm-6b93a.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
};

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = async (req, res) => {
    // CORS biar bisa dipanggil dari frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, title, body } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token diperlukan' });
    }

    try {
        const response = await admin.messaging().send({
            token: token,
            notification: {
                title: title || '🔔 Peringatan Kos',
                body: body || 'Ada notifikasi baru!'
            },
            webpush: {
                fcm_options: {
                    link: 'https://pzem.vercel.app/'
                }
            }
        });

        res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        console.error('Error kirim notifikasi:', error);
        res.status(500).json({ error: error.message });
    }
};