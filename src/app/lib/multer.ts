import multer from "multer";
const strorage = multer.memoryStorage();
export const upload = multer({ storage: strorage });
