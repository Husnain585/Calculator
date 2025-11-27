// src/lib/firebase-functions.ts
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

export const callFunction = (name: string) => httpsCallable(functions, name);
export default functions;