import { getFirebaseAdmin } from "../google/firebase";

export async function fetchAllItems(): Promise<any[]> {
  try {
    const firebase = await getFirebaseAdmin();

    if (!firebase) {
      throw new Error("Failed to get Firebase admin");
    }

    const snapshot = await firebase.firestore().collection("items").get(); // Correctly retrieve documents
    if (!snapshot.empty) {
      return snapshot.docs.flatMap((doc) => doc.data().tokens as any[]); // Map over documents and cast to ItemTokenAccount
    }
    return []; // Return an empty array if no documents found
  } catch (error) {
    console.error("Error fetching items:", error);
    throw new Error("Failed to fetch items from Firestore");
  }
}

async function getCache(cacheKey: string) {
  const firebase = await getFirebaseAdmin();

  if (!firebase) {
    throw new Error("Failed to get Firebase admin");
  }
  try {
    const doc = await firebase
      .firestore()
      .collection("items")
      .doc(cacheKey)
      .get();
    if (doc.exists) {
      return doc.data()?.tokens;
    }
  } catch (error) {
    console.error("Error getting cache:", error);
  }
  return null;
}
