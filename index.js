const Koa = require('koa');
const Cors = require('koa2-cors');
const BodyParser = require('koa-bodyparser');
const Mongoose = require('mongoose');
const router = require('./routes');

const dbName = 'decensor';
const mongooseOptions = {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
};
Mongoose.connect(`mongodb://localhost:27017/${dbName}`, mongooseOptions);


const app = new Koa();
const port = process.env.PORT;

const cors = Cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
});
app
    .use(BodyParser())
    .use(cors)
    .use(router())
    .listen(port);