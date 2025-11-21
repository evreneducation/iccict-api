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
    const existingPaper = await prisma.registerUser.findFirst({
      where: { email, paperId },
    });
    if (existingPaper) {
      return res.status(400).json({
        message: `Paper ID "${paperId}" already exists`,
        success: false,
      });
    }

    //check if email already exist or not
    const isExistingEmail = await prisma.registerUser.findUnique({
      where: { email },
    });
    if (isExistingEmail) {
      return res.status(400).json({
        message: `Email already exists`,
        success: false,
      });
    }

    // Check if transactionId already exists
    const existingTransaction = await prisma.registerUser.findFirst({
      where: { email, transactionId },
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

    // Create a 'User' record for the admin's "My Referrals" page
    if (referralCode && admin?.id) {
      try {
        await prisma.user.create({
          data: {
            name,
            email,
            referredBy: referralCode,
            adminId: admin.id,
          },
        });
      } catch (e) {
        // Non-blocking; don't fail registration on referral list creation
        console.warn("Failed to create referral user record:", e?.message || e);
      }
    }

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
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize || "25", 10), 1),
      100
    );
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.registerUser.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        // select: {
        //   id: true,
        //   name: true,
        //   email: true,
        //   paperId: true,
        //   transactionId: true,
        //   isPaid: true,
        //   createdAt: true,
        // },
      }),
      prisma.registerUser.count(),
    ]);

    res.status(200).json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
};

export const deleteRegisterUser = async (req, res) => {
  try {
    const { id } = req.params;

    const reg = await prisma.registerUser.findUnique({
      where: { id: Number(id) },
    });
    if (!reg) {
      return res.status(404).json({
        message: "Registration not found",
        success: false,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.registerUser.delete({ where: { id: Number(id) } });

      // Clean up the referral mirror rows
      await tx.user.deleteMany({
        where: {
          email: reg.email,
          adminId: reg.referredById || undefined,
          referredBy: reg.referralCode || undefined,
        },
      });
    });

    res.status(200).json({
      message: "Registration deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({
      message: "Error deleting registration",
      error: error.message,
      success: false,
    });
  }
};
