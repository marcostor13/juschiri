const router = require('express').Router();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.S3_REGION2 || "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID2,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY2,
  },
});

router.get('/presigned', async (req, res) => {
  try {
    const { fileName, fileType } = req.query;
    if (!fileName || !fileType) {
      return res.status(400).json({ error: "fileName and fileType are required" });
    }

    const key = `${process.env.S3_FOLDER || "products"}/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET2,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Construct the final public URL (assuming the bucket is public or has a distribution)
    const publicUrl = `https://${process.env.S3_BUCKET2}.s3.${process.env.S3_REGION2 || "us-east-2"}.amazonaws.com/${key}`;

    res.json({ uploadUrl: signedUrl, publicUrl });
  } catch (err) {
    console.error("S3 Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
