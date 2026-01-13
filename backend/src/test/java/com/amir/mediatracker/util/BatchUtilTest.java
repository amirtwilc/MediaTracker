package com.amir.mediatracker.util;

import com.amir.mediatracker.batch.dto.StepCount;
import com.amir.mediatracker.batch.util.BatchUtil;
import org.junit.jupiter.api.Test;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.StepExecution;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class BatchUtilTest {

    @Test
    public void countStepProperties_withNoSteps() {
        //Arrange
        JobExecution execution = new JobExecution(1L);
        //Act
        StepCount stepCount = BatchUtil.countStepProperties(execution);
        //Assert
        assertEquals(0, stepCount.getReadCount());
        assertEquals(0, stepCount.getWriteCount());
        assertEquals(0, stepCount.getSkipCount());
    }

    @Test
    public void countStepProperties_withOneStepAndOnlyReads() {
        //Arrange
        JobExecution execution = new JobExecution(1L);
        List<StepExecution> stepExecutionList = new ArrayList<>();
        stepExecutionList.add(createStepExecution(execution, 5, 0, 0));
        execution.addStepExecutions(stepExecutionList);
        //Act
        StepCount stepCount = BatchUtil.countStepProperties(execution);
        //Assert
        assertEquals(5, stepCount.getReadCount());
        assertEquals(0, stepCount.getWriteCount());
        assertEquals(0, stepCount.getSkipCount());
    }

    @Test
    public void countStepProperties_withOneStepAndOnlyWrite() {
        //Arrange
        JobExecution execution = new JobExecution(1L);
        List<StepExecution> stepExecutionList = new ArrayList<>();
        stepExecutionList.add(createStepExecution(execution, 0, 10, 0));
        execution.addStepExecutions(stepExecutionList);
        //Act
        StepCount stepCount = BatchUtil.countStepProperties(execution);
        //Assert
        assertEquals(0, stepCount.getReadCount());
        assertEquals(10, stepCount.getWriteCount());
        assertEquals(0, stepCount.getSkipCount());
    }

    @Test
    public void countStepProperties_withOneStepAndOnlySkips() {
        //Arrange
        JobExecution execution = new JobExecution(1L);
        List<StepExecution> stepExecutionList = new ArrayList<>();
        stepExecutionList.add(createStepExecution(execution, 0, 0, 1));
        execution.addStepExecutions(stepExecutionList);
        //Act
        StepCount stepCount = BatchUtil.countStepProperties(execution);
        //Assert
        assertEquals(0, stepCount.getReadCount());
        assertEquals(0, stepCount.getWriteCount());
        assertEquals(1, stepCount.getSkipCount());
    }

    @Test
    public void countStepProperties_withMultipleSteps() {
        //Arrange
        JobExecution execution = new JobExecution(1L);
        List<StepExecution> stepExecutionList = new ArrayList<>();
        stepExecutionList.add(createStepExecution(execution, 5, 1, 0));
        stepExecutionList.add(createStepExecution(execution, 10, 11, 0));
        stepExecutionList.add(createStepExecution(execution, 3, 22, 3));
        execution.addStepExecutions(stepExecutionList);
        //Act
        StepCount stepCount = BatchUtil.countStepProperties(execution);
        //Assert
        assertEquals(18, stepCount.getReadCount());
        assertEquals(34, stepCount.getWriteCount());
        assertEquals(3, stepCount.getSkipCount());
    }

    private StepExecution createStepExecution(JobExecution execution, int readCount, int writeCount, int skipCount) {
        StepExecution step = new StepExecution("1", execution);
        step.setReadCount(readCount);
        step.setWriteCount(writeCount);
        step.setProcessSkipCount(skipCount);
        return step;
    }
}
