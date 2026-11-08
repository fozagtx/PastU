process.env.MEMORY_MODE = "fake";
process.env.DB_PATH = ":memory:";
process.env.SESSION_SECRET = "test-session-secret";
process.env.DELEGATE_KEY_SECRET = "test-delegate-secret";
delete process.env.NEBIUS_API_KEY;
delete process.env.TATUM_API_KEY;
