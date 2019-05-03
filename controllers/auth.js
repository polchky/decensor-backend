const { OAuth2Client } = require('google-auth-library');
const JsonWebToken = require('jsonwebtoken');
const { User } = require('../models');

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
                JsonWebToken.sign(
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

    authenticate: async (userId, ctx, next) => {
        try {
            if (ctx.state.user.sub === userId) {
                await next();
            } else {
                console.log('mismatch!');
                ctx.response.status = 401;
            }
        } catch (err) {
            ctx.response.status = 401;
        }
    },
};

module.exports = controller;
