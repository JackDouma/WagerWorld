import { useState } from "react";
import { Typography, Button, Box, Link } from "@mui/material";
import { useTheme } from "@mui/material/styles";

function Index() {
  const theme = useTheme();

  return (
    <Box
      component="main"
      sx={{
        backgroundColor: theme.palette.primary.main,
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="95vh"
      >
        <Typography
          variant="general"
          sx={{
            color: theme.palette.primary.contrastText,
            fontSize: "2rem",
            margin: "0",
          }}
        >
          Welcome to
        </Typography>
        <Typography
          variant="heading"
          sx={{
            color: "#FFFFFF",
            fontSize: "7rem",
            marginTop: "0px",
            marginBottom: "40px",
            textShadow: "2px -6px 8px rgba(0, 0, 0, 0.5)",
            WebkitTextStroke: `1px ${theme.palette.secondary.main}`,
          }}
        >
          WagerWorld
        </Typography>
        <Button
          variant="contained"
          size="large"
          href="/signin"
          sx={{
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText,
            "&:hover": { backgroundColor: "#FFC700" },
            borderRadius: "40px",
            textTransform: "none",
            padding: "10px 32px",
            fontSize: "1.5rem",
          }}
        >
          <Typography variant="btn">Play Now ➔</Typography>
        </Button>
      </Box>
      <Box
        component="footer"
        sx={{
          backgroundColor: theme.palette.primary.light,
          color: theme.palette.primary.contrastText,
          textAlign: "center",
          padding: "12px",
          position: "absolute",
          bottom: 0,
          width: "100%",
        }}
      >
        <Typography variant="general">Looking to get your organization set up on WagerWorld? <Link href="/orgrequest" color="primary.dark"><strong>Submit an organization creation request.</strong></Link></Typography>
      </Box>
    </Box>
  );
}

export default Index;
