const { auth } = require('google-auth-library');
const { google } = require('googleapis');

let youtube;

function client() {
    if (youtube === undefined) {
        const creds = JSON.parse(process.env.GOOGLE_API_CREDS);
        const authClient = auth.fromJSON(creds);
        authClient.scopes = ['https://www.googleapis.com/auth/youtube.readonly'];
        youtube = google.youtube({
            version: 'v3',
            auth: authClient,
        });
    }
    return youtube;
}

module.exports = client;
