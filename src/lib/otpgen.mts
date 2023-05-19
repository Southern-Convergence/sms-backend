import otp from "otp-generator";

const OTP_LENGTH = 6;
const OTP_CONFIG = {
  lowerCaseAlphabets : false,
  specialChars       : false
};

export default ()=> otp.generate(OTP_LENGTH, OTP_CONFIG);