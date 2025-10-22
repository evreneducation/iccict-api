import { prisma } from "../config/db.js";
import { sendUserRegisterEmail } from "../services/emailService.js";

// export const registerUser = async (req, res) => {
//     const registerUserData = req.body;
//     const { referralCode } = registerUserData;

//     try {
//         let admin = null;

//         // If referral code is provided, verify it exists
//         if (referralCode) {
//             admin = await prisma.Admin.findUnique({
//                 where: { referralCode }
//             });

//             if (!admin) {
//                 return res.status(400).json({ message: 'Invalid referral code' });
//             }
//         }

//         // Create the user registration
//         const newRegisterUser = await prisma.registerUser.create({
//             data: {
//                 name: registerUserData.name,
//                 email: registerUserData.email,
//                 registrationType: registerUserData.registrationType,
//                 institutionName: registerUserData.institutionName,
//                 country: registerUserData.country,
//                 phone: registerUserData.phone,
//                 earlyBird: registerUserData.earlyBird,
//                 regFee: registerUserData.regFee,
//                 isPaid: registerUserData.isPaid,
//                 referralCode: referralCode || null,
//                 referredById: admin?.id || null
//             }
//         });

//         // Send confirmation emails
//         await sendUserRegisterEmail(registerUserData);

//         res.status(201).json({
//             message: 'User registered successfully',
//             user: newRegisterUser,
//             success: true
//         });
//     } catch (error) {
//         res.status(400).json({
//             error: `Error registering user: ${error.message}`,
//             success: false
//         });
//     }
// };

export const registerUser = async (req, res) => {
  const registerUserData = req.body;

  const {
    name,
    email,
    registrationType,
    institutionName,
    country,
    phone,
    earlyBird,
    regFee,
    isPaid,
    referralCode,
    paperId,
    transactionId,
    conferenceJoiningMode,
  } = registerUserData;

  const receiptFile = req.file;

  if (
    !conferenceJoiningMode ||
    !["Online", "InPerson"].includes(conferenceJoiningMode)
  ) {
    return res
      .status(400)
      .json({ error: "conferenceJoiningMode must be 'Online' or 'InPerson'" });
  }

  try {
    // Validate required text fields
    if (!paperId || !transactionId) {
      return res.status(400).json({
        message: "paperId and transactionId are required",
        success: false,
      });
    }

    // Validate receipt file presence
    if (!receiptFile) {
      return res.status(400).json({
        message: "uploadPaymentReceipt file is required",
        success: false,
      });
    }

    const receiptUrl =
      receiptFile.secure_url ||
      receiptFile.path ||
      receiptFile.location ||
      receiptFile.url ||
      null;

    if (!receiptUrl) {
      return res.status(500).json({
        message: "Uploaded receipt processed but URL could not be determined",
        success: false,
      });
    }

    // Check if paperId already exists
    const existingPaper = await prisma.registerUser.findUnique({
      where: { paperId },
    });
    if (existingPaper) {
      return res.status(400).json({
        message: `Paper ID "${paperId}" already exists`,
        success: false,
      });
    }

    // Check if transactionId already exists
    const existingTransaction = await prisma.registerUser.findUnique({
      where: { transactionId },
    });
    if (existingTransaction) {
      return res.status(400).json({
        message: `Transaction ID "${transactionId}" already exists`,
        success: false,
      });
    }

    // If referral code provided, validate admin
    let admin = null;
    if (referralCode) {
      admin = await prisma.Admin.findUnique({ where: { referralCode } });
      if (!admin) {
        return res.status(400).json({
          message: "Invalid referral code",
          success: false,
        });
      }
    }

    // Create the user registration record
    const newRegisterUser = await prisma.registerUser.create({
      data: {
        name,
        email,
        registrationType,
        institutionName,
        country,
        phone,
        earlyBird: earlyBird === "true" || earlyBird === true,
        regFee,
        isPaid: isPaid === "true" || isPaid === true,
        referralCode: referralCode || null,
        referredById: admin?.id || null,
        paperId,
        transactionId,
        uploadPaymentReceipt: receiptUrl,
        conferenceJoiningMode,
      },
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newRegisterUser,
      success: true,
    });

    sendUserRegisterEmail({
      ...registerUserData,
      uploadPaymentReceipt: receiptUrl,
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    return res.status(400).json({
      error: `Error registering user: ${error.message}`,
      success: false,
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const registeredUsers = await prisma.registerUser.findMany();
    res.status(200).json(registeredUsers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
};




