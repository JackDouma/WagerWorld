import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { Link, Typography, Box, TextField, Button, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useTheme } from "@mui/material/styles";
// import nodemailer from "nodemailer";
// TODO: Delete some of these.


function OrgRequest() {
    const theme = useTheme();
    const [orgName, setOrgName] = useState("");
    const [orgDomain, setOrgDomain] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [open, setOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");

    const handleClickOpen = (message) => {
        setAlertMessage(message);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const submitRequestButton = async () => {
        if (!orgName || !orgDomain || !ownerName || !ownerEmail || !ownerPassword) {
            handleClickOpen("Please fill out all fields before submitting.");
            return;
        }
        const domainRegex = /^[^\s@]+\.[^\s@]+$/;
        if (!domainRegex.test(orgDomain)) {
            handleClickOpen("The domain entered is invalid. Example of valid format: lakeheadu.ca");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ownerEmail)) {
            handleClickOpen("The email entered is invalid.");
            return;
        }
        if (ownerPassword.length < 6) {
            handleClickOpen("Password must be at least 6 characters long.");
            return;
        }

        
    };

    return (
        <Box component="main">
            <FormControl>
                <Typography variant="general">Organization Details</Typography>
                <TextField label="Name" variant="outlined" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                <TextField label="Domain" variant="outlined" type="text" value={orgDomain} onChange={(e) => setOrgDomain(e.target.value)} />

                <Typography variant="general">Organization Owner</Typography>
                <TextField label="Name" variant="outlined" type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                <TextField label="Email" variant="outlined" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                <TextField label="Password" variant="outlined" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />

                <Button onClick={submitRequestButton} variant="contained" size="large"
                    sx={{
                        backgroundColor: theme.palette.secondary.main,
                        color: theme.palette.secondary.contrastText,
                        "&:hover": { backgroundColor: "#FFC700" },
                        borderRadius: "40px",
                        textTransform: "none",
                        padding: "5px 32px",
                        fontSize: "1.5rem",
                        margin: "10px 0px",
                    }}
                >
                    <Typography variant="btn">Submit Request</Typography>
                </Button>
            </FormControl>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{"ERROR"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {alertMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default OrgRequest;