import jwt from 'jsonwebtoken'

export const generateToken = async (userId, res) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, //MS
        httpOnly: true, // prevents XSS attacks : cross site scripting
        sameSite: "none", // CSRF attacks
        secure: true, // ensures cookies are sent over HTTPS
    })

    return token
}