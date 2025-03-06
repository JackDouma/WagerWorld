import { useState } from "react";
import { Typography, Button, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

function Index() {
  const theme = useTheme();

  return (
    <Box
      component="main"
      sx={{
        backgroundColor: theme.palette.primary.main,
        minHeight: "100vh",
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="90vh"
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
    </Box>
  );
}

export default Index;
