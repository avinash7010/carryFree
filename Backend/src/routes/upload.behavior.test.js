import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import express from "express";

import lostItemRoutes from "../routes/lostItem.routes.js";
import foundItemRoutes from "../routes/foundItem.routes.js";
import { uploadService } from "../config/cloudinary.js";

const JWT_SECRET = "upload-test-secret";
const OWNER_ID = "64b000000000000000000001";

const tokenFor = (userId) => jwt.sign({ id: userId, role: "user" }, JWT_SECRET);

let originalUploadImage;
let createdItems = [];

const VALID_FIELDS_LOST = {
  title: "Lost Phone",
  description: "A black smartphone",
  category: "electronics",
  location: "Library",
  dateLost: "2026-08-30",
};

const VALID_FIELDS_FOUND = {
  title: "Found Phone",
  description: "A black smartphone found on bench",
  category: "electronics",
  location: "Park",
  dateFound: "2026-08-30",
};

function stubCloudinary(replacement) {
  uploadService.uploadImage = replacement;
}

function restoreCloudinary() {
  uploadService.uploadImage = originalUploadImage;
}

async function setupApp(routes, mountPath) {
  const LostItem = (await import("../models/LostItem.js")).default;
  const FoundItem = (await import("../models/FoundItem.js")).default;
  const Model = mountPath === "/api/lost-items" ? LostItem : FoundItem;

  createdItems = [];
  const originalCreate = Model.create;
  Model.create = async (doc) => {
    const item = { _id: "64b000000000000000000099", ...doc, createdAt: new Date(), updatedAt: new Date() };
    createdItems.push(item);
    return item;
  };

  const app = express();
  app.use(express.json());
  app.use(mountPath, routes);

  app.use((err, _req, res, _next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Maximum size is 5 MB." });
    }
    if (err.message && err.message.includes("Invalid file type")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  });

  return {
    app,
    Model,
    originalCreate,
    cleanup: () => {
      Model.create = originalCreate;
    },
  };
}

const sendMultipart = async (server, path, fields, file, token) => {
  const address = server.address();
  const boundary = "----TestBoundary" + Date.now();
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );
  }

  if (file) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
    );
    parts.push(file.buffer);
    parts.push("\r\n");
  }

  parts.push(`--${boundary}--\r\n`);

  const bodyParts = parts.map((p) =>
    typeof p === "string" ? Buffer.from(p) : p
  );
  const body = Buffer.concat(bodyParts);

  const headers = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length,
  };
  if (token) headers.authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method: "POST",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

const createFakeJpeg = () =>
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

const createTextFile = () => Buffer.from("This is not an image file");

async function runTests() {
  process.env.JWT_SECRET = JWT_SECRET;
  originalUploadImage = uploadService.uploadImage;

  // ─── LOST ITEM TESTS ───

  await test("Lost Item: POST with valid JPEG returns 201 and stores Cloudinary URL", async () => {
    stubCloudinary(async () => "https://res.cloudinary.com/test/image/upload/v1/lost.jpg");
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/lost-items", VALID_FIELDS_LOST,
        { fieldname: "image", filename: "phone.jpg", mimetype: "image/jpeg", buffer: createFakeJpeg() },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.success, true);
      assert.equal(result.body.data.image, "https://res.cloudinary.com/test/image/upload/v1/lost.jpg");
      assert.equal(createdItems.length, 1);
      assert.equal(createdItems[0].image, "https://res.cloudinary.com/test/image/upload/v1/lost.jpg");
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Lost Item: POST without image creates item with no image field", async () => {
    restoreCloudinary();
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/lost-items", VALID_FIELDS_LOST, null, tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.success, true);
      assert.equal(createdItems.length, 1);
      assert.ok(createdItems[0].image === undefined);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Lost Item: POST with invalid file type returns 400", async () => {
    stubCloudinary(async () => { throw new Error("should not be called"); });
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/lost-items", VALID_FIELDS_LOST,
        { fieldname: "image", filename: "notes.txt", mimetype: "text/plain", buffer: createTextFile() },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Lost Item: POST with oversized file returns 400", async () => {
    stubCloudinary(async () => { throw new Error("should not be called"); });
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff);
      const boundary = "----TestBoundaryOversize";
      const bodyParts = [
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nOversized\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nTest\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nother\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="location"\r\n\r\nTest\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="dateLost"\r\n\r\n2026-08-30\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="huge.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        oversizedBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ];
      const body = Buffer.concat(bodyParts);

      const result = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: server.address().port,
            path: "/api/lost-items",
            method: "POST",
            headers: {
              "Content-Type": `multipart/form-data; boundary=${boundary}`,
              "Content-Length": body.length,
              authorization: `Bearer ${tokenFor(OWNER_ID)}`,
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
              catch { resolve({ status: res.statusCode, body: data }); }
            });
          }
        );
        req.on("error", reject);
        req.write(body);
        req.end();
      });

      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Lost Item: POST without auth returns 401", async () => {
    restoreCloudinary();
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/lost-items", VALID_FIELDS_LOST, null, null
      );
      assert.equal(result.status, 401);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Lost Item: POST with PNG image is accepted", async () => {
    stubCloudinary(async () => "https://res.cloudinary.com/test/image/upload/v1/lost.png");
    const { app, cleanup } = await setupApp(lostItemRoutes, "/api/lost-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = await sendMultipart(
        server, "/api/lost-items", VALID_FIELDS_LOST,
        { fieldname: "image", filename: "photo.png", mimetype: "image/png", buffer: pngBuffer },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.data.image, "https://res.cloudinary.com/test/image/upload/v1/lost.png");
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─── FOUND ITEM TESTS ───

  await test("Found Item: POST with valid JPEG returns 201 and stores Cloudinary URL", async () => {
    stubCloudinary(async () => "https://res.cloudinary.com/test/image/upload/v1/found.jpg");
    const { app, cleanup } = await setupApp(foundItemRoutes, "/api/found-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/found-items", VALID_FIELDS_FOUND,
        { fieldname: "image", filename: "phone.jpg", mimetype: "image/jpeg", buffer: createFakeJpeg() },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.success, true);
      assert.equal(result.body.data.image, "https://res.cloudinary.com/test/image/upload/v1/found.jpg");
      assert.equal(createdItems.length, 1);
      assert.equal(createdItems[0].image, "https://res.cloudinary.com/test/image/upload/v1/found.jpg");
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Found Item: POST without image creates item with no image field", async () => {
    restoreCloudinary();
    const { app, cleanup } = await setupApp(foundItemRoutes, "/api/found-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/found-items", VALID_FIELDS_FOUND, null, tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.success, true);
      assert.equal(createdItems.length, 1);
      assert.ok(createdItems[0].image === undefined);
    } finally {
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Found Item: POST with invalid file type returns 400", async () => {
    stubCloudinary(async () => { throw new Error("should not be called"); });
    const { app, cleanup } = await setupApp(foundItemRoutes, "/api/found-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const result = await sendMultipart(
        server, "/api/found-items", VALID_FIELDS_FOUND,
        { fieldname: "image", filename: "script.js", mimetype: "application/javascript", buffer: Buffer.from("alert(1)") },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await test("Found Item: POST with WebP image is accepted", async () => {
    stubCloudinary(async () => "https://res.cloudinary.com/test/image/upload/v1/found.webp");
    const { app, cleanup } = await setupApp(foundItemRoutes, "/api/found-items");
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      const result = await sendMultipart(
        server, "/api/found-items", VALID_FIELDS_FOUND,
        { fieldname: "image", filename: "photo.webp", mimetype: "image/webp", buffer: webpBuffer },
        tokenFor(OWNER_ID)
      );
      assert.equal(result.status, 201);
      assert.equal(result.body.data.image, "https://res.cloudinary.com/test/image/upload/v1/found.webp");
    } finally {
      restoreCloudinary();
      cleanup();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
