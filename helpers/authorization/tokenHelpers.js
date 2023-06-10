const sendJwtToClient = (user, res) => {
  const token = user.generateJwtFromUser();
  const { JWT_COOKIE, NODE_ENV } = process.env;
  return res
    .status(200)
    .cookie("access_token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + parseInt(JWT_COOKIE) * 1000),
      secure: true,
      sameSite: "none"
    })
    .json({
      name: user.name,
      surname: user.surname,
      profilePicture: user.profilePicture,
      role: user.role,
      isSeller: user.seller.isSeller,
      
    })
};

const getAccessTokenFromHeader = (req) => {
  return req.headers["authorization"];
};
module.exports = {
  sendJwtToClient,
  getAccessTokenFromHeader,
};
