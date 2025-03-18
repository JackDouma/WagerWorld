import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      // orange
      light: "#ffcb78",
      main: "#ffa500",
      dark: "#f26800",
      contrastText: "#262626",
    },
    secondary: {
      // yellow
      light: "#fcec3f",
      main: "#ffd700",
      dark: "#f2cc00",
      contrastText: "#262626",
    },
  },
  typography: {
    general: {
      fontFamily: "Source Code Pro",
    },
    btn: {
      fontFamily: "Rowdies",
      fontWeight: 300,
    },
    heading: {
      fontFamily: "Rowdies",
    },
  },
});

export default theme;
