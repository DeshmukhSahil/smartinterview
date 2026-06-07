"use server";

// Get current user (mocked since auth is removed for ERP integration)
export async function getCurrentUser(): Promise<User | null> {
  return {
    id: "mock-user-id",
    name: "ERP User",
    email: "erpuser@mock.com",
  };
}

export async function isAuthenticated() {
  return true;
}