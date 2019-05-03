const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const controller = {
    signIn: async (ctx) => {
        try {
            const client = new OAuth2Client();
            const ticket = await client.verifyIdToken({
                idToken: `${ctx.request.body.token}`,
                audience: process.env.FRONTEND_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            // Check expiry date

            // Generate new JWT
            const promise = new Promise((resolve, reject) => {
                jwt.sign(
                    {
                        sub: payload.sub,
                        exp: payload.exp,
                    },
                    process.env.JWT_SECRET,
                    (err, token) => {
                        if (err) reject(err);
                        else resolve(token);
                    }
                );
            });
            const token = await promise;
            ctx.body = { token };
        } catch (err) {
            ctx.response.status = 400;
        }
    },
};

module.exports = controller;
