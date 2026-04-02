import { env } from './config/env';
import { prisma } from './config/database';
import app from './app';

async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');

    const server = app.listen(env.PORT, () => {
      console.log(`✓ Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received — shutting down gracefully`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✓ Database disconnected');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
