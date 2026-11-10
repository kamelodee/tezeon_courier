import { Alert } from 'react-native';
import * as Location from 'expo-location';

/**
 * Prominent disclosure for background location.
 *
 * Google Play requires an in-app screen explaining background location
 * collection BEFORE the runtime permission prompt is shown, and the
 * permissions declaration form requires a video of it. The app previously
 * called requestBackgroundPermissionsAsync() directly and only explained
 * itself in an alert AFTER a denial, which is the wrong order and gave us
 * nothing to film.
 *
 * The wording below is deliberate. Google's guidance asks for the data being
 * collected, that it happens in the background, and what it is used for, and
 * specifically expects the phrase "even when the app is closed or not in use".
 * Change the copy only against that guidance:
 * https://support.google.com/googleplay/android-developer/answer/9799150
 */

const TITLE = 'Share your location while delivering';

const BODY =
    'Tezeon Driver collects location data to show customers where their ' +
    'delivery has reached and to match you with jobs near you, even when the ' +
    'app is closed or not in use.\n\n' +
    'Tracking runs only while you are online. You can stop it at any time in ' +
    'Location Settings, and Android shows an indicator whenever it is running.';

/**
 * Show the disclosure and resolve with whether the courier agreed to continue.
 *
 * Skipped when background permission is already granted - the disclosure is
 * about to precede a prompt that will not appear.
 *
 * @returns {Promise<boolean>} true to go on and request the permission.
 */
export async function ensureBackgroundLocationDisclosure() {
    try {
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status === 'granted') return true;
    } catch {
        // Fall through and disclose anyway - showing it twice is harmless,
        // skipping it is a policy violation.
    }

    return new Promise((resolve) => {
        Alert.alert(
            TITLE,
            BODY,
            [
                { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Continue', onPress: () => resolve(true) },
            ],
            { cancelable: false },
        );
    });
}

export default ensureBackgroundLocationDisclosure;
