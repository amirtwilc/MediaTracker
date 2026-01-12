package com.amir.mediatracker.batch.config;

import org.springframework.batch.item.file.separator.SimpleRecordSeparatorPolicy;
import org.springframework.lang.NonNull;

/**
 * Policy that checks if this is end of the file.
 * Since Reader was configured to only accept lines with 5 columns,
 * without this policy the end of each file will throw an exception
 */
public class BlankLineRecordSeparatorPolicy extends SimpleRecordSeparatorPolicy {

    @Override
    public boolean isEndOfRecord(final String line) {
        return !line.trim().isEmpty() && super.isEndOfRecord(line);
    }

    @Override
    public String postProcess(@NonNull final String record) {
        if (record.trim().isEmpty()) {
            return null;
        }
        return super.postProcess(record);
    }
}
