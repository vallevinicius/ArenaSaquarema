// Ambiente mínimo e FAKE para os módulos que leem `env`. Nenhum banco/rede é tocado nos testes.
process.env.DATABASE_URL = 'mysql://u:p@localhost:3306/test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
