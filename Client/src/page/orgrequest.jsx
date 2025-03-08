import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Box, TextField, Button, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import emailjs from '@emailjs/browser';

function OrgRequest() {
    const theme = useTheme();
    const navigate = useNavigate();
    const [orgName, setOrgName] = useState("");
    const [orgDomain, setOrgDomain] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [ownerEmail, setOwnerEmail] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [open, setOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [dialogTitle, setDialogTitle] = useState("");
    const [emailjsResponse, setEmailjsResponse] = useState("");

    const handleClickOpen = (title, message) => {
        setDialogTitle(title);
        setAlertMessage(message);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        if (emailjsResponse === 200) {
            navigate("/");
        }
    };

    const submitRequestButton = async () => {
        if (!orgName || !orgDomain || !ownerName || !ownerEmail || !ownerPassword) {
            handleClickOpen("ERROR", "Please fill out all fields before submitting.");
            return;
        }
        const domainRegex = /^[^\s@]+\.[^\s@]+$/;
        if (!domainRegex.test(orgDomain)) {
            handleClickOpen("ERROR", "The domain entered is invalid. Example of valid format: lakeheadu.ca");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(ownerEmail)) {
            handleClickOpen("ERROR", "The email entered is invalid.");
            return;
        }
        if (ownerPassword.length < 6) {
            handleClickOpen("ERROR", "Password must be at least 6 characters long.");
            return;
        }

        var templateParams = {
            orgName: orgName,
            orgDomain: orgDomain,
            ownerName: ownerName,
            ownerEmail: ownerEmail,
            ownerPassword: ownerPassword
        };

        emailjs.send('service_q2zk9g9', 'template_p2ohttt', templateParams, { publicKey: `${import.meta.env.VITE_EMAILJS_PUBLIC_KEY}` }).then(
            (response) => {
                setEmailjsResponse(response.status);
                handleClickOpen("SUCCESS", "Request submitted successfully! WagerWorld will reach out once your organization has been created.");
            },
            (error) => {
                console.log('Error occurred when sending email: ', error);
                handleClickOpen("ERROR", "Failed to submit request. Please try again later.");
            },
        );
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
                <DialogTitle>{dialogTitle}</DialogTitle>
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