const request = require("supertest");
const { Model } = require("mongoose");
const mongoose = require("mongoose");
const app = require("../src/server"); 
const User = require("../src/models/userModel");
const bcrypt = require("bcryptjs");

describe("POST /api/pms/auth/login", () => {

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_DB);
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

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


