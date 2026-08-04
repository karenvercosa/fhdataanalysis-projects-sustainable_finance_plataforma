import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient()
}

// O cache do singleton vive no objeto global para sobreviver ao hot reload do
// Next em dev. Tipamos por cast em vez de redeclarar `globalThis` (SonarQube
// S2137): sombrear o nome reservado engana o leitor e quebra o tipo real.
type CacheGlobal = typeof globalThis & {
  prismaGlobal?: ReturnType<typeof prismaClientSingleton>;
};

const cacheGlobal = globalThis as CacheGlobal;

const prisma = cacheGlobal.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') cacheGlobal.prismaGlobal = prisma