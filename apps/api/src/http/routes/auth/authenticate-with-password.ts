import { prisma } from '@/lib/prisma'
import { compare } from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

export async function authenticateWithPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sessions/password',
    {
      schema: {
        tags: ['authe'],
        summary: 'Authenticate with email and password',
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const userFromemail = await prisma.user.findUnique({
        where: { email },
      })

      if (!userFromemail) {
        return reply.status(400).send({ message: 'Invalid credentials' })
      }

      if (userFromemail.passwordHash === null) {
        return reply
          .status(400)
          .send({ message: 'User does not have a password, use social login.' })
      }

      const isPasswordValid = await compare(
        password,
        userFromemail.passwordHash
      )

      if (!isPasswordValid) {
        return reply.status(400).send({ message: 'Invalid credentials' })
      }

      const token = await reply.jwtSign(
        {
          sub: userFromemail.id,
        },
        {
          sign: {
            expiresIn: '7d',
          },
        }
      )

      return reply.status(201).send({ token })
    }
  )
}
