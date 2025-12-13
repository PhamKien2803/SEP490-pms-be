const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/server");

let token;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_DB);

    const res = await request(app)
        .post("/api/pms/auth/login")
        .send({
            email: "Vintk@gmail.com",
            password: "12345678"
        });

    token = res.body.token;

    if (token.startsWith("Bearer ")) {
        token = token.replace("Bearer ", "");
    }
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe("POST /api/pms/auth/login", () => {

    test("Không nhập email", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({ password: "12345678" });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Nhập email");
    });

    test("Email sai định dạng", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "testlogin",
                password: "12345678"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Email nhập sai định dạng");
    });

    test("Password dưới 8 ký tự", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "123"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Mật khẩu phải có ít nhất 8 ký tự");
    });

    test("Sai mật khẩu", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "saimatkhau"
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Sai mật khẩu");
    });

    test("Login thành công", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "12345678"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Login success");
        expect(res.body.token).toBeDefined();
        expect(Array.isArray(res.body.permissionListAll)).toBe(true);
    });
});

describe("GET /api/pms/auth/getCurrentUser", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy thông tin user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Thông tin người dùng");
        expect(res.body.userProfile.email).toBe("Vintk@gmail.com");
        expect(Array.isArray(res.body.permissionListAll)).toBe(true);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});
