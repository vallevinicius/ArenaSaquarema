-- SOMENTE DESENVOLVIMENTO: `prisma migrate dev` cria um "shadow database" temporário
-- para detectar drift, então o usuário precisa de CREATE/DROP em nível global.
-- Em produção use `prisma migrate deploy` com um usuário restrito ao schema arena_saquarema.
GRANT CREATE, ALTER, DROP, REFERENCES, INDEX ON *.* TO 'arena'@'%';
FLUSH PRIVILEGES;
