import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Box, TextField, Button, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Link, CircularProgress } from "@mui/material";
import Grid from '@mui/material/Grid2';
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
    const [isLoading, setIsLoading] = useState(false);

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

        setIsLoading(true);

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
                setIsLoading(false);
            },
            (error) => {
                console.log('Error occurred when sending email: ', error);
                if (!(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)) {
                    handleClickOpen("ERROR", "Failed to submit request (missing environment variable).");
                } else {
                    handleClickOpen("ERROR", "Failed to submit request. Please try again later.");
                }
                setIsLoading(false);
            },
        );
    };

    return (
        <Box component="main" sx={{ padding: 0, height: '100vh' }}>
            <Grid container spacing={0}
                sx={{
                    width: '100%',
                    height: '100%',
                }}
            >

                {/* Left side */}
                <Grid size={{ md: 5, sm: 12, xs: 12 }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.palette.primary.main,
                        flexDirection: 'column',
                    }}
                >
                    <Link
                        href="/"
                        variant="heading"
                        sx={{
                            textDecoration: 'none',
                            color: "#FFFFFF",
                            textShadow: "2px -6px 8px rgba(0, 0, 0, 0.5)",
                            marginBottom: "10px",
                            WebkitTextStroke: `1px ${theme.palette.secondary.main}`,
                            fontSize: "5vw",
                            '@media (max-width:899px)': {
                                fontSize: "13vw",
                            },
                        }}
                    >
                        WagerWorld
                    </Link>
                    <Typography variant="general"
                        sx={{
                            textAlign: 'left',
                            width: '31vw',
                            '@media (max-width:899px)': {
                                width: "80vw",
                                textAlign: 'center',
                            },
                        }}
                    >
                        Fill out this form and we'll create your organization and an owner account on WagerWorld for you.
                    </Typography>
                </Grid>

                {/* Right side */}
                <Grid size={{ md: 7, sm: 12, xs: 12 }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                >
                    <FormControl>
                        <Typography
                            variant="general"
                            sx={{
                                color: theme.palette.primary.contrastText,
                                fontSize: "2rem",
                                marginBottom: "10px",
                                fontWeight: 600,
                            }}
                        >
                            Organization Details
                        </Typography>
                        <TextField label="Name" margin="dense" variant="outlined" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                            sx={{
                                width: '400px',
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.85)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <TextField label="Domain" margin="dense" variant="outlined" type="text" value={orgDomain} onChange={(e) => setOrgDomain(e.target.value)}
                            sx={{
                                width: '400px',
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.75)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <Typography
                            variant="general"
                            sx={{
                                color: theme.palette.primary.contrastText,
                                fontSize: "2rem",
                                marginBottom: "10px",
                                marginTop: "30px",
                                fontWeight: 600,
                            }}
                        >
                            Organization Owner
                        </Typography>
                        <TextField label="Name" margin="dense" variant="outlined" type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                            sx={{
                                width: '400px',
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.85)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <TextField label="Email" margin="dense" variant="outlined" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                            sx={{
                                width: '400px',
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -8px) scale(0.70)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <TextField label="Password" margin="dense" variant="outlined" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)}
                            sx={{
                                width: '400px',
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -8px) scale(0.70)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                    </FormControl>

                    <Button onClick={submitRequestButton} variant="contained" size="large" disabled={isLoading}
                        sx={{
                            backgroundColor: theme.palette.secondary.main,
                            color: theme.palette.secondary.contrastText,
                            "&:hover": { backgroundColor: "#FFC700" },
                            borderRadius: "40px",
                            textTransform: "none",
                            padding: "5px 30px",
                            fontSize: "1.5rem",
                            margin: "30px 0px",
                        }}
                    >
                        {isLoading ? <CircularProgress size={42} /> : <Typography variant="btn">Submit Request</Typography>}
                    </Button>
                </Grid>
            </Grid>

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