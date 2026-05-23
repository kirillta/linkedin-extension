/**
 * Storage contract: searchStrings
 *
 * Verifies getSearchStrings/setSearchStrings produce the expected shape and
 * that the read-modify-write pattern in setSearchStrings merges correctly.
 */
import { loadScript } from '../setup/load-script.js';

loadScript('storage-utils.js');

describe('searchStrings contract — getter defaults', () => {
    test('returns empty strings array when storage is empty', async () => {
        const result = await getSearchStrings();
        expect(result).toEqual({ strings: [] });
    });

    test('returns stored strings array', async () => {
        const list = [{ id: 'str_1', label: 'HR Talent', value: 'ht,talent,hhrr' }];
        await setSearchStrings({ strings: list });

        const result = await getSearchStrings();
        expect(result.strings).toEqual(list);
    });
});

describe('searchStrings contract — setter merges correctly', () => {
    test('setSearchStrings replaces strings array', async () => {
        const first = [{ id: 'str_1', label: 'A', value: 'a' }];
        await setSearchStrings({ strings: first });

        const second = [{ id: 'str_2', label: 'B', value: 'b' }];
        await setSearchStrings({ strings: second });

        const { strings } = await getSearchStrings();
        expect(strings).toEqual(second);
    });

    test('setSearchStrings does not overwrite a concurrent independent write of a different key', async () => {
        // The read-modify-write uses getSearchStrings() which only knows about `strings`.
        // A separate storage key written by another feature should not be touched.
        await chrome.storage.local.set({ memberHiderSettings: { hideUnreachable: true } });

        await setSearchStrings({ strings: [{ id: 'str_1', label: 'X', value: 'x' }] });

        const raw = await new Promise((resolve) =>
            chrome.storage.local.get(['memberHiderSettings'], (r) => resolve(r.memberHiderSettings))
        );
        expect(raw).toEqual({ hideUnreachable: true });
    });

    test('consecutive upserts accumulate entries', async () => {
        const { strings: initial } = await getSearchStrings();
        const updated = [...initial, { id: 'str_1', label: 'L1', value: 'v1' }];
        await setSearchStrings({ strings: updated });

        const { strings: after1 } = await getSearchStrings();
        expect(after1).toHaveLength(1);

        const updated2 = [...after1, { id: 'str_2', label: 'L2', value: 'v2' }];
        await setSearchStrings({ strings: updated2 });

        const { strings: after2 } = await getSearchStrings();
        expect(after2).toHaveLength(2);
    });
});
