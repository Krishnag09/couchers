import {
  Box,
  FormControlLabel,
  InputLabel,
  makeStyles,
  Radio,
  RadioGroup,
} from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useHistory, useLocation, useParams } from "react-router-dom";

import Autocomplete from "../../../components/Autocomplete";
import Button from "../../../components/Button";
import CircularProgress from "../../../components/CircularProgress";
import EditUserLocationMap, {
  ApproximateLocation,
} from "../../../components/EditUserLocationMap";
import TextBody from "../../../components/TextBody";
import TextField from "../../../components/TextField";
import TOS from "../../../components/TOS";
import { HostingStatus } from "../../../pb/api_pb";
import { signupRoute } from "../../../routes";
import { service } from "../../../service";
import {
  nameValidationPattern,
  usernameValidationPattern,
  validatePastDate,
} from "../../../utils/validation";
import { hostingStatusLabels } from "../../profile/constants";
import { useAuthContext } from "../AuthProvider";
import useAuthStyles from "../useAuthStyles";

type SignupInputs = {
  email: string;
  username: string;
  name: string;
  birthdate: string;
  city: string;
  gender: string;
  acceptTOS: boolean;
  hostingStatus: HostingStatus;
  location: ApproximateLocation;
};

const useStyles = makeStyles((theme) => ({
  genderRadio: {
    display: "flex",
    flexDirection: "row",
  },
  locationMap: {
    width: "100%",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
}));

export default function CompleteSignup() {
  const { authState, authActions } = useAuthContext();
  const authLoading = authState.loading;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    errors,
  } = useForm<SignupInputs>({
    defaultValues: { city: "", location: {} },
    shouldUnregister: false,
    mode: "onBlur",
  });

  const [loading, setLoading] = useState(false);
  const [isLocationEmpty, setIsLocationEmpty] = useState(false);
  const [acceptedTOS, setAcceptedTOS] = useState(false);

  const { urlToken } = useParams<{ urlToken: string }>();
  const location = useLocation();
  const history = useHistory();
  const classes = useStyles();
  const authClasses = useAuthStyles();

  useEffect(() => {
    (async () => {
      if (urlToken) {
        setLoading(true);
        try {
          setValue("email", await service.auth.getSignupEmail(urlToken), {
            shouldDirty: true,
          });
        } catch (err) {
          authActions.authError(err.message);
          history.push(signupRoute);
          return;
        }
        setLoading(false);
      }
    })();
  }, [urlToken, authActions, location.pathname, setValue, history]);

  const completeSignup = handleSubmit(async (data: SignupInputs) => {
    if (Object.entries(data.location).length === 0) {
      setIsLocationEmpty(true);
      return;
    }

    authActions.signup({
      signupToken: urlToken,
      username: data.username,
      name: data.name,
      city: data.city,
      location: data.location,
      birthdate: data.birthdate,
      gender: data.gender,
      hostingStatus: data.hostingStatus,
      acceptTOS: acceptedTOS,
    });
  });

  return (
    <>
      {loading ? (
        <CircularProgress />
      ) : (
        <form className={authClasses.form} onSubmit={completeSignup}>
          <InputLabel className={authClasses.formLabel} htmlFor="username">
            Username
          </InputLabel>
          <TextField
            className={authClasses.formField}
            variant="standard"
            id="username"
            name="username"
            fullWidth
            inputRef={register({
              required: "Enter your username",
              pattern: {
                //copied from backend, added ^ at the start
                value: usernameValidationPattern,
                message:
                  "Username can only have lowercase letters, numbers or _, starting with a letter.",
              },
              validate: async (username) => {
                const valid = await service.auth.validateUsername(username);
                return valid || "This username is taken.";
              },
            })}
            helperText={errors?.username?.message}
          />
          <InputLabel className={authClasses.formLabel} htmlFor="full-name">
            Full name
          </InputLabel>
          <TextField
            className={authClasses.formField}
            id="full-name"
            variant="standard"
            name="name"
            fullWidth
            inputRef={register({
              required: "Enter your name",
              pattern: {
                value: nameValidationPattern,
                message: "Name can't be just white space.",
              },
            })}
            helperText={errors?.name?.message}
          />
          <InputLabel className={authClasses.formLabel} htmlFor="birthdate">
            Birthday
          </InputLabel>
          <TextField
            className={authClasses.formField}
            id="birthdate"
            fullWidth
            variant="standard"
            name="birthdate"
            type="date"
            InputLabelProps={{
              shrink: true,
            }}
            inputRef={register({
              required: "Enter your birthdate",
              validate: (stringDate) =>
                validatePastDate(stringDate) ||
                "Must be a valid date in the past.",
            })}
            helperText={errors?.birthdate?.message}
          />
          <InputLabel className={authClasses.formLabel} htmlFor="location">
            Your location
          </InputLabel>
          <Controller
            name="location"
            control={control}
            inputRef={register({
              required: "Enter your location",
            })}
            render={({ onChange }) => (
              <EditUserLocationMap
                className={classes.locationMap}
                // react-hook-forms doesn't set value immediately
                // so || "" prevents a uncontrolled->controlled warning
                city={getValues("city") || ""}
                setCity={(value) => setValue("city", value)}
                setLocation={(location) => {
                  setIsLocationEmpty(false);
                  return onChange({
                    lat: location.lat,
                    lng: location.lng,
                    radius: location.radius,
                  });
                }}
              />
            )}
          />
          {isLocationEmpty && (
            <TextBody>Please, select your location.</TextBody>
          )}
          <InputLabel
            className={authClasses.formLabel}
            htmlFor="hosting-status"
          >
            Hosting status
          </InputLabel>
          <Controller
            control={control}
            name="hostingStatus"
            defaultValue={null}
            render={({ onChange }) => (
              <Autocomplete
                className={authClasses.formField}
                id="hosting-status"
                label=""
                onChange={(_, option) => onChange(option)}
                options={[
                  HostingStatus.HOSTING_STATUS_CAN_HOST,
                  HostingStatus.HOSTING_STATUS_MAYBE,
                  HostingStatus.HOSTING_STATUS_CANT_HOST,
                ]}
                getOptionLabel={(option) => hostingStatusLabels[option]}
                disableClearable
                // below required for type inference
                multiple={false}
                freeSolo={false}
              />
            )}
          />
          <InputLabel className={authClasses.formLabel} htmlFor="gender">
            I identify as ....
          </InputLabel>
          <Controller
            id="gender"
            control={control}
            name="gender"
            defaultValue=""
            render={({ onChange }) => (
              <RadioGroup
                className={classes.genderRadio}
                aria-label="gender"
                name="gender-radio"
                onChange={onChange}
              >
                <FormControlLabel
                  value="Woman"
                  control={<Radio />}
                  label="Woman"
                />
                <FormControlLabel value="Man" control={<Radio />} label="Man" />
                <FormControlLabel
                  value="Non-binary"
                  control={<Radio />}
                  label="Non-binary"
                />
              </RadioGroup>
            )}
          />
          <Box>
            <TOS />
            <Button
              classes={{
                root: authClasses.button,
                label: authClasses.buttonText,
              }}
              color="secondary"
              loading={loading}
              onClick={() => setAcceptedTOS(true)}
              disabled={acceptedTOS}
            >
              {acceptedTOS ? "Thanks!" : "Accept"}
            </Button>
          </Box>
          <Button
            classes={{
              root: authClasses.button,
              label: authClasses.buttonText,
            }}
            color="secondary"
            onClick={completeSignup}
            type="submit"
            loading={authLoading || loading}
            disabled={!acceptedTOS}
          >
            Sign up
          </Button>
        </form>
      )}
    </>
  );
}
