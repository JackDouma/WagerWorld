import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { app } from "../../firebase";
import { Typography, Box, TextField, Button, Card, FormControl, Checkbox, FormGroup, FormControlLabel } from "@mui/material";
import Grid from '@mui/material/Grid2';
import { useTheme } from "@mui/material/styles";

const db = getFirestore(app)

function OrgSettingsById() {
    const { orgId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // not adding domain as an option to edit, seems like something that would break stuff if a non site admin can adust
    const [orgName, setOrgName] = useState('');
    const [adultOnly, setAdultOnly] = useState(false);
    const [allowBlackJack, setAllowBlackJack] = useState(false);
    const [allowPoker, setAllowPoker] = useState(false);
    const [allowRoulette, setAllowRoulette] = useState(false);
    const [allowHorseRacing, setAllowHorseRacing] = useState(false);
    const [allowBaccarat, setAllowBaccarat] = useState(false);
    const [defaultBalance, setDefaultBalance] = useState(false);

    // TODO add wagering settings when we come to a decision on what can be edited for the games

    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const orgRef = doc(db, 'orgs', orgId);
                const orgDoc = await getDoc(orgRef);

                if (orgDoc.exists()) {
                    const orgData = orgDoc.data();

                    setOrgName(orgData.name);
                    setAdultOnly(orgData.adultOnly);
                    setAllowBlackJack(orgData.allowBlackJack);
                    setAllowPoker(orgData.allowPoker);
                    setAllowRoulette(orgData.allowRoulette);
                    setAllowHorseRacing(orgData.allowHorseRacing);
                    setAllowBaccarat(orgData.allowBaccarat);
                    setDefaultBalance(orgData.defaultBalance);
                }
            }
            catch (error) {
                console.error("ERROR: ", error);
            }
        };

        fetchOrg();
    }, [orgId]);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!orgName) {
            setError('All fields are required.');
            return;
        }

        // update firebase with the edits
        try {
            const orgRef = doc(db, 'orgs', orgId);

            await updateDoc(orgRef, {
                name: orgName,
                adultOnly,
                allowBlackJack,
                allowPoker,
                allowRoulette,
                allowHorseRacing,
                allowBaccarat,
                defaultBalance
            });

            navigate(`/org/${orgId}`);
        }
        catch (error) {
            console.error("ERROR: ", error);
        }
    };

    useEffect(() => {
        document.body.style.backgroundColor = "#ffe5bd";
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    return (
        <Box component="main">
            <Card
                sx={{
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Typography variant="heading"
                    sx={{
                        fontSize: '2.5vw',
                        color: theme.palette.primary.main,
                        marginBottom: '12px',
                    }}
                >
                    Organization Settings
                </Typography>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <form onSubmit={handleSave}>
                    <FormControl fullWidth>
                        <TextField label="Name" margin="normal" variant="outlined" type="text" id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required
                            sx={{
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
                        <TextField label="Default Balance" margin="normal" variant="outlined" type="number" id="defaultBalance" value={defaultBalance} onChange={(e) => setDefaultBalance(e.target.value)} required
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.63)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <FormControlLabel control={<Checkbox />} label="Adult Only" id="adultOnly" checked={adultOnly} onChange={(e) => setAdultOnly(e.target.checked)} sx={{ display: 'flex', justifyContent: 'center' }} />
                        <Typography variant="general" sx={{ marginY: '10px' }}>
                            Allowed Games:
                        </Typography>
                        <FormGroup>
                            <Grid container spacing={1} justifyContent={"center"}>
                                <FormControlLabel control={<Checkbox />} label="Blackjack" id="allowBlackjack" checked={allowBlackJack} onChange={(e) => setAllowBlackJack(e.target.checked)} />
                                <FormControlLabel control={<Checkbox />} label="Poker" id="allowPoker" checked={allowPoker} onChange={(e) => setAllowPoker(e.target.checked)} />
                            </Grid>
                            <Grid container spacing={1} justifyContent={"center"}>
                                <FormControlLabel control={<Checkbox />} label="Horse Racing" id="allowHorseRacing" checked={allowHorseRacing} onChange={(e) => setAllowHorseRacing(e.target.checked)} />
                                <FormControlLabel control={<Checkbox />} label="Roulette" id="allowRoulette" checked={allowRoulette} onChange={(e) => setAllowRoulette(e.target.checked)} />
                                <FormControlLabel control={<Checkbox />} label="Baccarat" id="allowBaccarat" checked={allowBaccarat} onChange={(e) => setAllowBaccarat(e.target.checked)} />
                            </Grid>
                        </FormGroup>

                        <Button type="submit" variant="contained" size="large"
                            sx={{
                                backgroundColor: theme.palette.secondary.main,
                                color: theme.palette.secondary.contrastText,
                                "&:hover": { backgroundColor: "#FFC700" },
                                borderRadius: "40px",
                                textTransform: "none",
                                padding: "5px 30px",
                                fontSize: "1.5rem",
                                marginTop: "20px",
                            }}
                        >
                            <Typography variant="btn">Save</Typography>
                        </Button>
                    </FormControl>
                </form>
            </Card>
        </Box>
    );
}

export default OrgSettingsById;