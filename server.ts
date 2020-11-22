import fastify from 'fastify'
import fastifyStatic from 'fastify-static'

(async () => {
    fastify()
        .register(fastifyStatic, {
            root: __dirname,
        })
        .get('/', async (_request, reply) => reply.sendFile('game.html'))
        .listen(3000)
})()
