import fastify from 'fastify';
import fastifyStatic from 'fastify-static';

const server = fastify({ logger: false })
    .register(fastifyStatic, {
        root: __dirname,
    }).get('/', async function (_request, reply) {
        return reply.sendFile('game.html')
    })

const start = async () => {
    try {
        await server.listen(3000);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

start();